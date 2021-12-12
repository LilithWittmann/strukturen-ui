import Vue from "vue";
import Router from "vue-router";
import OrgcharList from "./views/OrgchartList";

Vue.use(Router);

export default new Router({
  mode: "history",
  base: process.env.BASE_URL,
  routes: [
    {
      path: "/",
      name: "home",
      component: OrgcharList,
    },
    {
      path: "/orgchart/:id",
      name: "orgchart",
      component: () =>
        import(/* webpackChunkName: "about" */ "./views/Orgchart.vue"),
    },
  ],
});
