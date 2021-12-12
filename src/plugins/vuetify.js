import Vue from "vue";
import Vuetify from "vuetify";
import "vuetify/dist/vuetify.min.css";

Vue.use(Vuetify);
import en from "vuetify/es5/locale/en";
export default new Vuetify({
  framework: {
    lang: { locales: { en }, current: "en" },
  },
  lang: { locales: { en }, current: "en" },
});
