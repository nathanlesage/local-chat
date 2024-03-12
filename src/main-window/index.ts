import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import VueFeather from 'vue-feather'

// Import global styles
import '../global.css'

const app = createApp(App)
  .use(createPinia())
  .component(VueFeather.name, VueFeather)
  .mount('#app')
