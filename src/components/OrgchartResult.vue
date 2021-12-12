<template>
  <v-card height="400px" class="scroll">
    <vue-json-pretty :path="'res'" :data="this.$props.json"> </vue-json-pretty>
  </v-card>
</template>

<script>
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
export default {
  name: "OrgchartResult",
  components: {
    VueJsonPretty,
  },
  props: ["json"],
};
</script>

<style scoped>
.scroll {
  overflow-y: scroll;
}
</style>
