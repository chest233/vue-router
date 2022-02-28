import { warn } from '../util/warn'
import { extend } from '../util/misc'
import { handleRouteEntered } from '../util/route'

export default {
  name: 'RouterView',
  functional: true,
  props: {
    name: {
      type: String,
      default: 'default'
    }
  },
  render (_, context) {
    let { props, children, parent, data } = context
    console.log('context===', context)
    // used by devtools to display a router-view badge
    data.routerView = true
    // directly use parent context's createElement() function
    // so that components rendered by router-view can resolve named slots
    const h = parent.$createElement // vm类型, 为了具备解析具名插槽的能力
    // const h = _ // vm类型, 为了具备解析具名插槽的能力
    const name = props.name
    // parent.$route的访问，会建立parent与_route之间的依赖关系，
    // 当_route变化的时候，parent就会render
    // 这才是router-view组件只要渲染过一次，在route变化时
    // router-view组件无论是什么情况，都会重新render的根本原因
    const route = parent.$route
    // 组件缓存存在父组件中, 所以要确保父组件活着, 才能被缓存
    const cache = parent._routerViewCache || (parent._routerViewCache = {})

    // determine current view depth, also check to see if the tree
    // has been toggled inactive but kept-alive.
    let depth = 0
    let inactive = false  // true: 当前的router-view组件，正处于一个keep-alive模式下且当前是非激活状态的tree当中
    // 结束条件 父组件不是是根组件(有vm.$options.router的)
    console.log('judge==========', parent && parent._routerRoot !== parent, parent)
    while (parent && parent._routerRoot !== parent) {
      const vnodeData = parent.$vnode ? parent.$vnode.data : {}
      if (vnodeData.routerView) {
        depth++
      }
      if (vnodeData.keepAlive && parent._directInactive && parent._inactive) {
        inactive = true
      }
      // 循环条件: 向上递归, 找到一个router-view,depth++,  inactive=true条件todo
      parent = parent.$parent
    }
    console.log('depth====', depth)
    data.routerViewDepth = depth

    // render previous view if the tree is inactive and kept-alive
    // 真正缓存的时机, 当前的router-view组件，正处于一个keep-alive模式下,且当前是非激活状态的tree当中
    // 把这个需要缓存的组件, 缓存起来
    // ** inactive 是为了处理根路由 keep-alive, 在嵌套路由中, 处于非活跃状态的子路由
    // 在 parent 中渲染好
    if (inactive) {
      console.log('inactive=========')
      const cachedData = cache[name] // 缓存存在parent中
      const cachedComponent = cachedData && cachedData.component
      if (cachedComponent) {
        // #2301
        // pass props
        if (cachedData.configProps) {
          fillPropsinData(cachedComponent, data, cachedData.route, cachedData.configProps)
        }
        // 返回的这个vnode也是inactive的，就是不可见的。因为如果直接返回h()，
        // 则会导致cachedComponent本应该保持的状态丢失，也就是会把inactive的节点实例给销毁了。
        // 当cachedComponent从inactive恢复到active时，之前的状态就都丢了。从devtools调试发现，当直接return h()，
        // router-view对应的节点已经不再是之前的component了。这会导致keep-alive的不一致性。
        return h(cachedComponent, data, children) // 为了缓存, 只是得到了 vnode, 并不会展示在页面
      } else {
        // render previous empty view
        return h()
      }
    }
    const matched = route.matched[depth]
    const component = matched && matched.components[name]

    // render empty node if no matched route or no config component
    if (!matched || !component) {
      cache[name] = null
      return h()
    }

    // cache component
    // 无论是否需要被缓存组件, 这里都会先存下来
    cache[name] = { component }
    console.log('cache======--', cache)

    // attach instance registration hook
    // this will be called in the instance's injected lifecycle hooks
    // beforeCreate 和 destroyed 维护 matched.instances
    data.registerRouteInstance = (vm, val) => {
      // val could be undefined for unregistration
      const current = matched.instances[name]
      if (
        (val && current !== vm) ||
        (!val && current === vm)
      ) {
        matched.instances[name] = val
      }
    }

    // also register instance in prepatch hook
    // in case the same component instance is reused across different routes
    ;(data.hook || (data.hook = {})).prepatch = (_, vnode) => {
      matched.instances[name] = vnode.componentInstance
    }

    // register instance in init hook
    // in case kept-alive component be actived when routes changed
    data.hook.init = (vnode) => {
      if (vnode.data.keepAlive &&
        vnode.componentInstance &&
        vnode.componentInstance !== matched.instances[name]
      ) {
        matched.instances[name] = vnode.componentInstance
      }

      // if the route transition has already been confirmed then we weren't
      // able to call the cbs during confirmation as the component was not
      // registered yet, so we call it here.
      handleRouteEntered(route)
    }

    const configProps = matched.props && matched.props[name]
    // save route and configProps in cache
    if (configProps) {
      extend(cache[name], {
        route,
        configProps
      })
      fillPropsinData(component, data, route, configProps)
    }
    console.log('component, data, children', component, data, children)
    const vnode = h(component, data, children)
    console.log('vnode-------', vnode)
    return vnode
  }
}

function fillPropsinData (component, data, route, configProps) {
  // resolve props
  let propsToPass = data.props = resolveProps(route, configProps)
  if (propsToPass) {
    // clone to prevent mutation
    propsToPass = data.props = extend({}, propsToPass)
    // pass non-declared props as attrs
    const attrs = data.attrs = data.attrs || {}
    for (const key in propsToPass) {
      if (!component.props || !(key in component.props)) {
        attrs[key] = propsToPass[key]
        delete propsToPass[key]
      }
    }
  }
}

function resolveProps (route, config) {
  switch (typeof config) {
    case 'undefined':
      return
    case 'object':
      return config
    case 'function':
      return config(route)
    case 'boolean':
      return config ? route.params : undefined
    default:
      if (process.env.NODE_ENV !== 'production') {
        warn(
          false,
          `props in "${route.path}" is a ${typeof config}, ` +
          `expecting an object, function or boolean.`
        )
      }
  }
}
