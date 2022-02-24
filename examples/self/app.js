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
    return h('h5', {}, [this.msg, h('router-view')])
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
    return h('h5', {}, this.msg)
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
  name: 'Baz',
  data () {
    return {
      msg: 'baz'
    }
  },
  render (h) {
    return h('h5', {}, [this.msg, h(BazChild, [h('span', 'defualt'), h('span', { slot: 'header' }, 'header')])])
  }
}
const BazChild = {
  name: 'BazChild',
  data () {
    return {
      msg: 'BazChild'
    }
  },
  render (h) {
    return h('h5', {}, [this.msg, '==', this.$slots.default, '==', this.$slots.header])
  }
}

Vue.component('Foo', Foo)
Vue.component('Qux', Qux)
Vue.component('Bar', Bar)
Vue.component('BarUi', BarUi)
Vue.component('Baz', Baz)
Vue.component('BazChild', BazChild)

Vue.use(VueRouter)

const router = new VueRouter({
  routes: [
    {
      path: '/foo/:id(\\d+)',
      components: { default: Foo },
      children: [
        { path: 'qux', component: Qux }
      ]
    },
    { path: '/bar', components: { 'default': Bar, 'bar-ui': BarUi }},
    { path: '/baz', components: { 'default': Baz }}
  ]
})

router.beforeEach((to, from, next) => {
  next()
})

router.beforeResolve((to, from, next) => {
  next()
})

new Vue({
  router,
  render (h) {
    return h('div', [h('h1', 'App'),
      h('router-link', { props: { to: '/foo/233' }}, 'to /foo/233'),
      h('br'), h('br'),
      h('router-link', { props: { to: '/foo/233/qux' }}, 'to /foo/233/qux'),
      h('br'), h('br'),
      h('router-link', { props: { to: '/bar' }}, 'to /bar'),
      h('router-link', { props: { to: '/baz' }}, 'to /baz'),
      h('router-view'),
      h('router-view', {
        props: { name: 'bar-ui' }, scopedSlots: {
          default: props => h('h1', props.age),
          header: props => h('h1', props.age)
        }
      })
    ])
  }
}).$mount('#app')
