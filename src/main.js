import Vue from "vue";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import VueKonva from "vue-konva";
import axios from "axios";
import VueAxios from "vue-axios";

Vue.use(VueKonva);
Vue.use(VueAxios, axios);

Vue.config.productionTip = false;

new Vue({
  vuetify,
  render: (h) => h(App),
}).$mount("#app");
