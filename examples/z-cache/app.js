import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const Home = {
  data () {
    return {
      msg: 'Home'
    }
  },
  render (h) {
    return h('div', [this.msg, h('router-view')])
  }
}
const Foo = {
  data () {
    return {
      msg: 'Foo'
    }
  },
  render (h) {
    return h('div', this.msg)
  },
  mounted () {
    console.log('foo mounted====')
  },
  beforeRouteEnter (to, from, next) {
    console.log('beforeRouteEnter=====Foo', to, from)
    next()
  },
  beforeRouteUpdate (to, from, next) {
    console.log('beforeRouteUpdate=====Foo', to, from)
    next()
  }
}

const Bar = {
  data () {
    return {
      msg: 'Bar'
    }
  },
  render (h) {
    return h('div', this.msg)
  }
}
const Me = {
  data () {
    return {
      msg: 'Me'
    }
  },
  render (h) {
    return h('div', this.msg)
  }
}

const router = new VueRouter({
  routes: [
    {
      path: '/home', component: Home, children: [
        { path: 'foo', component: Foo },
        { path: 'bar', component: Bar }
      ]
    },
    {
      path: '/me', component: Me, beforeEnter: (to, from, next) => {
        console.log('beforeEnter to=====', to)
        console.log('beforeEnter from=====', from)
        next()
      }
    }
  ]
})

router.beforeEach((to, from, next) => {
  console.log('beforeEach to=====', to)
  console.log('beforeEach from=====', from)
  next()
})
router.beforeResolve((to, from, next) => {
  console.log('beforeResolve to=====', to)
  console.log('beforeResolve from=====', from)
  // setTimeout(next, 2000)
  next()
})
router.afterEach((to, from) => {
  console.log('afterEach to=====', to)
  console.log('afterEach from=====', from)
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
    return h('div', [
      this.msg,
      h('br'),
      h('router-link', { props: { to: '/home/foo' }}, '/home/foo'),
      h('br'),
      h('router-link', { props: { to: '/home/bar' }}, '/home/bar'),
      h('br'),
      h('router-link', { props: { to: '/me' }}, '/me'),
      h('br'),
      h('keep-alive', [h('router-view')])])
  }
}).$mount('#app')
