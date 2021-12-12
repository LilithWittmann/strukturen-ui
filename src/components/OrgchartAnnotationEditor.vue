<template>
  <div>
    <v-progress-linear
      :value="this.idx / (this.$props.dataset.length / 100)"
    ></v-progress-linear>

    <br />
    <v-row no-gutters>
      <v-col cols="12" sm="6">
        <img width="300" v-if="previewImage" :src="previewImage" />
        <br />
        <br />
        <h4>Text</h4>
        <span style="white-space: pre">{{
          this.$props.dataset[this.idx].text
        }}</span>
        <br />
        <h4>Colors</h4>
        <div
          v-bind:key="c"
          v-for="c in this.$props.dataset[this.idx].colors"
          :style="{
            width: '30px',
            display: 'inline-block',
            height: '30px',
            'background-color': `rgb(${c[0]}, ${c[1]}, ${c[2]})`,
          }"
        ></div>

        <br /><br />
      </v-col>
      <v-col cols="12" sm="6">
        <div class="text-center" v-if="isLoading">
          <v-progress-circular
            indeterminate
            color="primary"
          ></v-progress-circular>
        </div>
        <v-form v-model="valid" v-if="!isLoading">
          <v-jsf
            v-model="model"
            :options="{ editMode: 'inline' }"
            :schema="schema"
          />
        </v-form>
      </v-col>
      <v-btn @click="previousItem()">previous </v-btn>
      <v-btn color="primary" @click="nextItem()"> next </v-btn>
    </v-row>
  </div>
</template>

<script>
import "@koumoul/vjsf/lib/VJsf.css";
import "@koumoul/vjsf/lib/deps/third-party.js";
import VJsf from "@koumoul/vjsf";
import "@koumoul/vjsf/dist/main.css";
import "regenerator-runtime/runtime";
export default {
  props: ["dataset", "orgchart_id"],
  components: { VJsf },
  name: "OrgchartAnnotationEditor",
  watch: {
    idx: function () {
      this.loadData();
    },
    dataset: function () {
      this.loadData();
    },
    annotations: function (val) {
      this.model = { organisations: val.parsed };
    },
  },
  methods: {
    loadData() {
      this.previewImage = `http://127.0.0.1:8090/orgchart-image/?orgchart_id=${
        this.$props.orgchart_id
      }&page=0&position=${this.$props.dataset[this.idx].position.join(
        "&position="
      )}`;

      if ("parsed" in this.$props.dataset[this.idx]) {
        this.model = this.$props.dataset[this.idx]["parsed"];
        this.annotations = this.$props.dataset[this.idx]["annotations"];
      } else {
        this.isLoading = true;
        this.axios
          .get(
            `http://127.0.0.1:8090/analyze-orgchart-entry/?text=${encodeURI(
              this.$props.dataset[this.idx].text
            )}`
          )
          .then((response) => this.loadAnnotationsDone(response["data"]));
      }
    },
    storeCurrentItem() {
      this.$props.dataset[this.idx]["parsed"] = this.model;
      this.$props.dataset[this.idx]["annotations"] = this.annotations;
      this.annotations = [];
      this.model = null;
    },
    nextItem() {
      this.storeCurrentItem();
      if (this.idx + 1 < this.$props.dataset.length) {
        this.idx = this.idx + 1;
      } else {
        this.$emit("annotationDone");
      }
    },
    previousItem() {
      this.storeCurrentItem();
      if (this.idx - 1 > -1) {
        this.idx = this.idx - 1;
      } else {
        this.$emit("back");
      }
    },
    loadAnnotationsDone(response) {
      this.annotations = response;
      this.isLoading = false;
    },
  },
  data() {
    return {
      schema: {
        type: "object",
        title: "Organisations",
        properties: {
          organisations: {
            type: "array",
            title: "Organisation",
            items: {
              type: "object",
              properties: {
                short_name: {
                  type: "string",
                  title: "short name",
                },
                name: {
                  type: "string",
                  title: "name",
                },
                dial_codes: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
                people: {
                  type: "array",
                  items: {
                    title: "Person",
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      position: { type: "string" },
                    },
                    required: ["name", "surname"],
                  },
                },
              },
            },
          },
        },
      },
      idx: 0,
      previewImage: null,
      annotations: null,
      valid: null,
      model: null,
      isLoading: false,
    };
  },
};
</script>

<style scoped></style>
