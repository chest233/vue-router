/* @flow */

import type VueRouter from '../index'
import { parsePath, resolvePath } from './path'
import { resolveQuery } from './query'
import { fillParams } from './params'
import { warn } from './warn'
import { extend } from './misc'

/**
 * 此函数是处理例如 $router.push({path: '/detail', query: {id: 1}}) 里的参数的
 * 返回一个 { _normalized,path,query,hash  }, row主要有4种情况
 * 1. 包含name，不含path的对象，如{name: 'detail', params: {id: 1}}
 * 2. 不含path和name，但是含有params的对象，这种路由形式用来进行仅params发生变化的相对路由，如{params: {id: 1}}
 * 3. 字符串形式，如'/detail'，就是直接用路径进行路由的场景
 * 4. 不含name，含path的对象，如{path: '/detail', query: {id: 1}}
 * */

export function normalizeLocation (
  raw: RawLocation, // 要进行正规化处理的原始数据
  current: ?Route,  // 当前的路由对象
  append: ?boolean, // 是否为追加模式，与path解析相关，主要是给router-link提供的
  router: ?VueRouter // vue-router的实例对象
): Location {
  let next: Location = typeof raw === 'string' ? { path: raw } : raw
  // named target
  if (next._normalized) {
    return next
  } else if (next.name) {
    next = extend({}, raw)
    const params = next.params
    if (params && typeof params === 'object') {
      next.params = extend({}, params)
    }
    return next
  }

  // relative params
  if (!next.path && next.params && current) {
    next = extend({}, next)
    next._normalized = true
    const params: any = extend(extend({}, current.params), next.params)
    if (current.name) {
      next.name = current.name
      next.params = params
    } else if (current.matched.length) {
      const rawPath = current.matched[current.matched.length - 1].path
      next.path = fillParams(rawPath, params, `path ${current.path}`)
    } else if (process.env.NODE_ENV !== 'production') {
      warn(false, `relative params navigation requires a current route.`)
    }
    return next
  }

  const parsedPath = parsePath(next.path || '')
  const basePath = (current && current.path) || '/'
  const path = parsedPath.path
    ? resolvePath(parsedPath.path, basePath, append || next.append)
    : basePath

  const query = resolveQuery(
    parsedPath.query,
    next.query,
    router && router.options.parseQuery
  )

  let hash = next.hash || parsedPath.hash
  if (hash && hash.charAt(0) !== '#') {
    hash = `#${hash}`
  }

  return {
    _normalized: true,
    path,
    query,
    hash
  }
}
