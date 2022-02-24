import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const Foo = {
  mounted () {
    console.log('this==', this)
  },
  render (h) {
    return h('div', [h('h1', 'Foo'), h('router-view')])
  }
}
const Bar = {
  template: `
    <div>
      <slot></slot>
      <slot name="test" avatar="avatar"></slot>
    </div>`,
  mounted () {
    console.log('====', this.$attrs)
  }
}
const Qux = {
  render (h) {
    return h('h1', { style: { color: 'red' }}, 'Qux')
  }
}

const router = new VueRouter({
  routes: [
    {
      path: '/foo/:id(\\d+)',
      components: { default: Foo },
      children: [
        { name: 'qux', path: 'qux', component: Qux, props: { name: 'huihui', age: 5 }}
      ]
    },
    { path: '/bar/', components: { default: Bar }}
  ]
})

router.beforeEach((to, from, next) => {
  console.log('beforeEach====', from)
  console.log('beforeEach====', to)
  next()
})

router.beforeResolve((to, from, next) => {
  console.log('beforeResolve====', from)
  console.log('beforeResolve====', to)
  next()
})

new Vue({
  router, template: `
    <div id='app'>
      <h1>APP</h1>
      <li><router-link to='/foo/123'>go foo</router-link></li>
      <li><router-link to='/foo/122333/qux'>go qux</router-link></li>
      <li><router-link to='/bar'>go bar</router-link></li>
      <br>
      <router-view title="title">
        <template #test='{avatar}'>
        <p>{{avatar}}</p>
        </template>
        <p>流云诸葛</p>
      </router-view>
    </div>
  `
}).$mount('#app')
