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
  },
  mounted () {
    console.log('qux====', this)
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
  render (h) {
    return h('h5', ['Baz', h(BazChild, [h('span', 'defualt'), h('span', { slot: 'header' }, 'header')])])
  }
}
const BazChild = {
  render (h) {
    return h('h5', ['BazChild', h('br'), this.$slots.header, h('br'), this.$slots.default])
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
    return h('div', [h('h1', ''),
      h('router-link', { props: { to: '/foo/233' }}, '/foo/233--'),
      h('router-link', { props: { to: '/foo/233/qux' }}, '/foo/233/qux--'),
      h('router-link', { props: { to: '/bar' }}, '/bar--'),
      h('router-link', { props: { to: '/baz' }}, '/baz--'),
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
