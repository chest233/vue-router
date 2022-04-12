/* @flow */

import { _Vue } from '../install'
import type Router from '../index'
import { inBrowser } from '../util/dom'
import { runQueue } from '../util/async'
import { warn } from '../util/warn'
import { START, isSameRoute, handleRouteEntered } from '../util/route'
import {
  flatten,
  flatMapComponents,
  resolveAsyncComponents
} from '../util/resolve-components'
import {
  createNavigationDuplicatedError,
  createNavigationCancelledError,
  createNavigationRedirectedError,
  createNavigationAbortedError,
  isError,
  isNavigationFailure,
  NavigationFailureType
} from '../util/errors'
import { handleScroll } from '../util/scroll'

export class History {
  router: Router
  base: string  // 默认值: "/" 应用的基路径。例如，如果整个单页应用服务在 /app/ 下，然后 base 就应该设为 "/app/"
  current: Route  // 当前的路由对象
  pending: ?Route // 正在处理的路由对象
  cb: (r: Route) => void  // 1.这个回调函数会通过this.listen注册, 2.在Router类中可以看到它, 3.UI更新是通过这个触发的
  ready: boolean  // 状态变量，是否已初始化好
  readyCbs: Array<Function>  // 初始化成功时的回调函数数组
  readyErrorCbs: Array<Function>  // 初始化失败时的回调函数数组
  errorCbs: Array<Function> // 路由失败时的回调函数数组
  listeners: Array<Function>
  cleanupListeners: Function

  // implemented by sub-classes
  +go: (n: number) => void
  +push: (loc: RawLocation, onComplete?: Function, onAbort?: Function) => void
  +replace: (
    loc: RawLocation,
    onComplete?: Function,
    onAbort?: Function
  ) => void
  +ensureURL: (push?: boolean) => void  // 这个的作用是：更改浏览器地址，都在子类中实现
  +getCurrentLocation: () => string // 这个的作用是：从浏览器地址中获取当前的路由访问路径，都在子类中实现
  +setupListeners: Function

  constructor (router: Router, base: ?string) {
    this.router = router
    this.base = normalizeBase(base) // 正规化base option
    // start with a route object that stands for "nowhere"
    this.current = START
    this.pending = null
    this.ready = false
    this.readyCbs = []
    this.readyErrorCbs = []
    this.errorCbs = []
    this.listeners = []
  }
  // 注册route updated成功时的回调函数
  // 外部借助这个回调函数更新UI
  listen (cb: Function) {
    this.cb = cb
  }
  // 添加ready相关的回调函数
  onReady (cb: Function, errorCb: ?Function) {
    if (this.ready) {
      cb()
    } else {
      this.readyCbs.push(cb)
      if (errorCb) {
        this.readyErrorCbs.push(errorCb)
      }
    }
  }
  // 添加失败时的回调函数
  onError (errorCb: Function) {
    this.errorCbs.push(errorCb)
  }
  // 路由跳转
  transitionTo (
    location: RawLocation,
    onComplete?: Function,
    onAbort?: Function
  ) {
    let route
    // catch redirect option https://github.com/vuejs/vue-router/issues/3201
    try {
      // route变量就是即将要跳转的目标Route对象
      route = this.router.match(location, this.current)
    } catch (e) {
      this.errorCbs.forEach(cb => {
        cb(e)
      })
      // Exception should still be thrown
      throw e
    }
    const prev = this.current
    this.confirmTransition(
      route,
      () => {
        this.updateRoute(route)
        onComplete && onComplete(route)
        this.ensureURL()  //  调用this.ensureURL更新浏览器地址，利用BOM History API(pushstate replacestate hash)
        this.router.afterHooks.forEach(hook => {
          hook && hook(route, prev)
        })

        // fire ready cbs once
        // 下面仅执行一次
        if (!this.ready) {
          this.ready = true
          this.readyCbs.forEach(cb => {
            cb(route)
          })
        }
      },
      err => {
        if (onAbort) {
          onAbort(err)
        }
        // 下面仅执行一次
        if (err && !this.ready) {
          // Initial redirection should not mark the history as ready yet
          // because it's triggered by the redirection instead
          // https://github.com/vuejs/vue-router/issues/3225
          // https://github.com/vuejs/vue-router/issues/3331
          if (!isNavigationFailure(err, NavigationFailureType.redirected) || prev !== START) {
            this.ready = true
            this.readyErrorCbs.forEach(cb => {
              cb(err)
            })
          }
        }
      }
    )
  }
  // 确认
  confirmTransition (route: Route, onComplete: Function, onAbort?: Function) {
    const current = this.current
    this.pending = route
    /* 有以下几种场景会导致abort执行：(可能只适用于上个版本..)
      跳转重复，触发NavigationDuplicated
      在执行guards函数过程中，检测到路由发生了变化，要中断之前的路由
      在guards函数执行时，用户在guards函数内调用了next(false)手工中断了路由
      在guards函数执行时，用户在guards函数内调用了next(newLocation: RawLocation)切换了路由
      捕获到异常 */
    const abort = err => {
      // changed after adding errors with
      // https://github.com/vuejs/vue-router/pull/3047 before that change,
      // redirect and aborted navigation would produce an err == null
      if (!isNavigationFailure(err) && isError(err)) {
        if (this.errorCbs.length) {
          this.errorCbs.forEach(cb => {
            cb(err)
          })
        } else {
          if (process.env.NODE_ENV !== 'production') {
            warn(false, 'uncaught error during route navigation:')
          }
          console.error(err)
        }
      }
      onAbort && onAbort(err)
    }
    const lastRouteIndex = route.matched.length - 1
    const lastCurrentIndex = current.matched.length - 1
    if (
      isSameRoute(route, current) &&
      // in the case the route map has been dynamically appended to
      lastRouteIndex === lastCurrentIndex &&
      route.matched[lastRouteIndex] === current.matched[lastCurrentIndex]
    ) {
      this.ensureURL()
      if (route.hash) {
        handleScroll(this.router, current, route, false)
      }
      return abort(createNavigationDuplicatedError(current, route))
    }

    /* matched 数组里面是什么呢？它里面存放的是与route对象关联的RouteRecord记录。
      resolveQueue函数的作用是从两个matched数组中，
      1. 解析出哪些RouteRecord接下来是要做updated处理的，
      2. 哪些是接下来要进行deactivated处理的，
      3. 哪些接下来是要进行activated处理的
       */
    const { updated, deactivated, activated } = resolveQueue(
      this.current.matched,
      route.matched
    )
    // queue是个数组，存放了大部分的guards（官方文档介绍的那些守卫函数）
    // queue里面的每个元素要么是空的，要么是一个回调函数，如果是一个回调函数的话，还满足这个形式： (to, from, next) => { ... }
    const queue: Array<?NavigationGuard> = [].concat(
      // in-component leave guards
      extractLeaveGuards(deactivated),  // 也就是官方文档中介绍的路由导航守卫beforeRouteLeave
      // global before hooks
      this.router.beforeHooks,  // 也就是官方文档中介绍的全局前置守卫beforeEach
      // in-component update hooks
      extractUpdateHooks(updated),  // 也就是官方文档中介绍的路由导航守卫beforeRouteUpdate
      // in-config enter guards
      activated.map(m => m.beforeEnter),  // 也就是官方文档中介绍的路由独享的守卫beforeEnter
      // async components
      resolveAsyncComponents(activated) // 异步组件解析
    )

    const iterator = (hook: NavigationGuard, next) => {
      if (this.pending !== route) {
        // pending代表一种路由处理的状态
        // 如果在调用过程pending不再等于外部闭包内的route，说明路由发生了变化
        // 所以原先的route就应该被取消掉
        return abort(createNavigationCancelledError(current, route))
      }
      try {
        // hook就是guard
        // 所以hook的第三个参数，就是guard的第三个参数next
        // 如 beforeEnter: (to, from, next) => {...}
        hook(route, current, (to: any) => {
          if (to === false) {
            // next(false) -> abort navigation, ensure current URL
            this.ensureURL(true)
            abort(createNavigationAbortedError(current, route))
          } else if (isError(to)) {
            this.ensureURL(true)
            abort(to)
          } else if (
            typeof to === 'string' ||
            (typeof to === 'object' &&
              (typeof to.path === 'string' || typeof to.name === 'string'))
          ) {
            // next('/') or next({ path: '/' }) -> redirect
            abort(createNavigationRedirectedError(current, route))
            if (typeof to === 'object' && to.replace) {
              this.replace(to)
            } else {
              this.push(to)
            }
          } else {
            // confirm transition and pass on the value
            // 下面的next参数实际上runQueue传进来的，调用它就能让runQueue自动调用下一个guard
            next(to)
          }
        })
      } catch (e) {
        abort(e)
      }
    }

    runQueue(queue, iterator, () => {
      // wait until async components are resolved before
      // extracting in-component enter guards
      // 当queue对应的所有guard都完成了调用时，就会进入这里
      const enterGuards = extractEnterGuards(activated)
      const queue = enterGuards.concat(this.router.resolveHooks)
      runQueue(queue, iterator, () => {
        if (this.pending !== route) {
          return abort(createNavigationCancelledError(current, route))
        }
        this.pending = null
        onComplete(route)
        if (this.router.app) {
          this.router.app.$nextTick(() => {
            handleRouteEntered(route)
          })
        }
      })
    })
  }
  // Route对象更新
  // 前面的this.cb会在这里面被调用
  updateRoute (route: Route) {
    this.current = route
    this.cb && this.cb(route) // 外部借此回调函数更新UI
  }

  setupListeners () {
    // Default implementation is empty
  }

  teardown () {
    // clean up event listeners
    // https://github.com/vuejs/vue-router/issues/2341
    this.listeners.forEach(cleanupListener => {
      cleanupListener()
    })
    this.listeners = []

    // reset current history route
    // https://github.com/vuejs/vue-router/issues/3294
    this.current = START
    this.pending = null
  }
}

function normalizeBase (base: ?string): string {
  if (!base) {
    if (inBrowser) {
      // respect <base> tag
      const baseEl = document.querySelector('base')
      base = (baseEl && baseEl.getAttribute('href')) || '/'
      // strip full URL origin
      base = base.replace(/^https?:\/\/[^\/]+/, '')
    } else {
      base = '/'
    }
  }
  // make sure there's the starting slash
  if (base.charAt(0) !== '/') {
    base = '/' + base
  }
  // remove trailing slash
  return base.replace(/\/$/, '')
}

function resolveQueue (
  current: Array<RouteRecord>,
  next: Array<RouteRecord>
): {
  updated: Array<RouteRecord>,
  activated: Array<RouteRecord>,
  deactivated: Array<RouteRecord>
} {
  let i
  const max = Math.max(current.length, next.length)
  // 接下来的这个for循环，是为了得到一个i值
  // 从0开始遍历，直到两个matched数组，相同的i，对应的元素不是同一个为止
  // 这里用的是全不等号，所以判断的是元素的引用是否相同，也就是判断它们是否为同1个RouteRecord对象
  // 如果current与next不存在嵌套关系，那么这个i值一般来说就是0
  // 如果它们存在嵌套关系，那么这个值就不一定是0了
  for (i = 0; i < max; i++) {
    if (current[i] !== next[i]) {
      break
    }
  }
  //   /a/b/c
  //   /a/b

  // 假如当前地址是/a/b/c，那么当前matched大概是：[a, b, c]；接下来如果要访问的是/a/d，那么目标matched应该是：[a,d]，按照resolveQueue的处理，最后结果就是：
  // updated: [a],
  // activated: [d],
  // deactivated: [b,c]
  return {
    updated: next.slice(0, i),  // next数组中[0,i)这个部分是属于被update的RouteRecords
    activated: next.slice(i), // next数组中[i, next.length)这个元素对应的恰好是要被激活的RouteRecords
    deactivated: current.slice(i) // current数组中[i,next.length)这个部分属于被deactived的RouteRecords
  }
}

function extractGuards (
  records: Array<RouteRecord>,
  name: string,
  bind: Function,
  reverse?: boolean
): Array<?Function> {
  // def, instance, match, key这四个参数都是在flatMapComponents这个函数内部从records里面解析出来的
  // def是组件定义的对象
  // instance是从record.instances数组内读出的vue实例
  // match是RouteRecord本身
  // key对应到的就是router-view的name属性
  const guards = flatMapComponents(records, (def, instance, match, key) => {
    console.log('flatMapComponents======records', records)
    console.log('flatMapComponents======def', def)
    console.log('flatMapComponents======instance', instance)
    console.log('flatMapComponents======match', match)
    console.log('flatMapComponents======key', key)
    const guard = extractGuard(def, name)
    console.log('guard====', guard)
    if (guard) {
      return Array.isArray(guard)
        ? guard.map(guard => bind(guard, instance, match, key))
        : bind(guard, instance, match, key)
    }
  })
  console.log('guards=====', guards)
  return flatten(reverse ? guards.reverse() : guards)
}

function extractGuard (
  def: Object | Function,
  key: string
): NavigationGuard | Array<NavigationGuard> {
  console.log('def===', def)
  if (typeof def !== 'function') {
    // extend now so that global mixins are applied.
    def = _Vue.extend(def)
    console.log('def=====22', def, def.options)
  }
  return def.options[key]
}

function extractLeaveGuards (deactivated: Array<RouteRecord>): Array<?Function> {
  // 为什么最后一个参数要传true，代表最后要把guards逆序处理
  // deactivated这个数组的元素顺序实际上代表的是组件的嵌套关系
  // 在beforeRouteLeave这个guard处理时，显然应该先执行子组件的beforeRouteLeave guard，再执行父级的
  // 这个顺序跟deactivated数组的元素顺序是相反的，所以需要逆序
  return extractGuards(deactivated, 'beforeRouteLeave', bindGuard, true)
}

function extractUpdateHooks (updated: Array<RouteRecord>): Array<?Function> {
  return extractGuards(updated, 'beforeRouteUpdate', bindGuard)
}

function bindGuard (guard: NavigationGuard, instance: ?_Vue): ?NavigationGuard {
  if (instance) {
    return function boundRouteGuard () {
      return guard.apply(instance, arguments)
    }
  }
}

function extractEnterGuards (
  activated: Array<RouteRecord>
): Array<?Function> {
  return extractGuards(
    activated,
    'beforeRouteEnter',
    (guard, _, match, key) => {
      return bindEnterGuard(guard, match, key)
    }
  )
}

function bindEnterGuard (
  guard: NavigationGuard,
  match: RouteRecord,
  key: string
): NavigationGuard {
  return function routeEnterGuard (to, from, next) {
    return guard(to, from, cb => {
      if (typeof cb === 'function') {
        if (!match.enteredCbs[key]) {
          match.enteredCbs[key] = []
        }
        match.enteredCbs[key].push(cb)
      }
      next(cb)
    })
  }
}
