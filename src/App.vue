<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <div class="d-flex align-center">
        <b>Namen & Strukturen</b>
      </div>

      <v-spacer></v-spacer>
    </v-app-bar>

    <v-main>
      <OrgchartEditor></OrgchartEditor>
    </v-main>
  </v-app>
</template>

<script>
import OrgchartEditor from "./components/OrgchartEditor";

export default {
  name: "App",

  components: {
    OrgchartEditor,
  },

  data: () => ({
    //
  }),
};
</script>
