import Vue from "vue";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import VueKonva from "vue-konva";
import axios from "axios";
import VueAxios from "vue-axios";
import router from "./router";
import VJsf from "@koumoul/vjsf";
import "@koumoul/vjsf/dist/main.css";

Vue.component("VJsf", VJsf);

Vue.use(VueKonva);
Vue.use(VueAxios, axios);

const _global =
  (typeof window !== "undefined" && window) ||
  (typeof global !== "undefined" && global) ||
  {};
_global.markdownit = require("markdown-it");

Vue.config.productionTip = false;

new Vue({
  vuetify,
  router,
  render: (h) => h(App),
}).$mount("#app");
