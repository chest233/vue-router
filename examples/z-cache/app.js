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
    { path: '/me', component: Me }
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
