/* @flow */

export function runQueue (queue: Array<?NavigationGuard>, fn: Function, cb: Function) {
  const step = index => {
    if (index >= queue.length) {
      // 整个回调队列完成执行时回调cb
      cb()
    } else {
      if (queue[index]) {
        fn(queue[index], () => {
          // 第二个参数作为一个回调函数，在fn的内部应该被主动调用
          // 以便执行下一个队列中的任务
          step(index + 1)
        })
      } else {
        // 没有queue[index]，则直接进入下一个
        step(index + 1)
      }
    }
  }
  step(0)
}
