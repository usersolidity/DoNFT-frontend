import Vue from 'vue'
import App from './App.vue'
import router from './router';
import store from './store'
import VModal from 'vue-js-modal'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import { BootstrapVue, IconsPlugin } from 'bootstrap-vue'
import { NavbarPlugin } from 'bootstrap-vue'


Vue.config.productionTip = false
Vue.use(VModal)
Vue.use(BootstrapVue)
Vue.use(IconsPlugin)
Vue.use(NavbarPlugin)

new Vue({
  router,
  store,
  render: h => h(App),
}).$mount('#app')
