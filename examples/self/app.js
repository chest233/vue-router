import Vue from 'vue'
import VueRouter from 'vue-router'

const Foo = {
  name: 'Foo',
  data () {
    return {
      msg: 'foo'
    }
  },
  render (h) {
    // return h('h5', {}, [this.msg, h('router-view')])
    return h('h5', {}, [this.msg, h('keep-alive', [h('router-view')])])
  }
}
const Qux = {
  name: 'Qux',
  data () {
    return {
      msg: 'qux'
    }
  },
  render (h) {
    return h('h5', {}, this.msg)
  },
  mounted () {
    console.log('mounted====qux', this)
  }
}

const Quux = {
  name: 'Quux',
  data () {
    return {
      msg: 'quux'
    }
  },
  render (h) {
    return h('h5', {}, this.msg)
  },
  mounted () {
    console.log('mounted====quux', this)
  }
}

const Bar = {
  name: 'Bar',
  data () {
    return {
      msg: 'bar'
    }
  },
  render (h) {
    return h('h5', {}, [this.msg, h(FnComp, { props: { title: 'title===' }})])
  }
}
const FnComp = {
  functional: true,
  render (h, context) {
    console.log('======$parent222', context.parent) // 函数式组件不能作为$parent
    return h('div', ['FnComp====' + context.props.title, h(FnCompChild)])
  }
}
const FnCompChild = {
  render (h) {
    console.log('======$parent', this.$parent) // 找到上级的第一个非函数式组件
    return h('div', 'FnCompChild====')
  }
}
const BarUi = {
  name: 'BarUi',
  data () {
    return {
      msg: 'baBarUir'
    }
  },
  render (h) {
    return h('h5', {}, [this.msg, this.$scopedSlots.default({ age: 123 }), this.$scopedSlots.header({ age: 2333 })])
  }
}
const Baz = {
  render (h) {
    return h('h5', ['Baz', h(BazChild, [h('span', 'defualt'), h('span', { slot: 'header' }, 'header')])])
  }
}
const BazChild = {
  render (h) {
    return h('h5', ['BazChild', h('br'), this.$slots.header, h('br'), this.$slots.default])
  }
}

Vue.component('Foo', Foo) // 嵌套父路由
Vue.component('Qux', Qux) // 嵌套子路由
Vue.component('Quux', Quux) // 嵌套子路由
Vue.component('Bar', Bar) // 含有函数式组件
Vue.component('BarUi', BarUi) // 路由 components 指定name && $scopedSlots
Vue.component('Baz', Baz) // 父组件 指定 named slot 参数
Vue.component('BazChild', BazChild) //  named $slots

Vue.use(VueRouter)

const router = new VueRouter({
  routes: [
    {
      path: '/foo/:id(\\d+)',
      components: { default: Foo },
      children: [
        { path: 'qux', component: Qux },
        { path: 'quux', component: Quux }
      ]
    },
    { path: '/bar', components: { 'default': Bar, 'bar-ui': BarUi }},
    { path: '/baz', components: { 'default': Baz }}
  ]
})

new Vue({
  router,
  name: 'app',
  data () {
    return {
      msg: 'app'
    }
  },
  render (h) {
    return h('div', [h('h1', ''),
      h('router-link', { props: { to: '/foo/233' }}, '/foo/233'),
      h('br'),
      h('router-link', { props: { to: '/foo/233/qux' }}, '/foo/233/qux'),
      h('br'),
      h('router-link', { props: { to: '/foo/233/quux' }}, '/foo/233/quux'),
      h('br'),
      h('router-link', { props: { to: '/bar' }}, '/bar'),
      h('br'),
      h('router-link', { props: { to: '/baz' }}, '/baz'),

      // h('keep-alive', [
      //   h('router-view'),
      //   h('router-view', {
      //     props: { name: 'bar-ui' }, scopedSlots: {
      //       default: props => h('h1', props.age),
      //       header: props => h('h1', props.age)
      //     }
      //   })
      // ])

      h('router-view'),
      h('router-view', {
        props: { name: 'bar-ui' }, scopedSlots: {
          default: props => h('h1', props.age),
          header: props => h('h1', props.age)
        }
      })
      //
    ])
  }
}).$mount('#app')
