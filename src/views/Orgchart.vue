<template>
  <v-app>
    <v-stepper v-model="e1">
      <v-stepper-header>
        <v-stepper-step :complete="e1 > 1" step="1">
          Assign Parents
        </v-stepper-step>

        <v-divider></v-divider>

        <v-stepper-step :complete="e1 > 2" step="2">
          Review NER
        </v-stepper-step>

        <v-divider></v-divider>

        <v-stepper-step step="3"> Review Result </v-stepper-step>
      </v-stepper-header>

      <v-stepper-items>
        <v-stepper-content step="1">
          <v-btn color="primary" @click="parentAssignmentDone()"
            >Continue
          </v-btn>
          <v-main>
            <OrgchartEditor
              ref="orgchart_editor"
              :id="$route.params.id"
            ></OrgchartEditor>
          </v-main>
        </v-stepper-content>

        <v-stepper-content step="2">
          <OrgchartAnnotationEditor
            ref="orgchart_annotation_editor"
            :orgchart_id="$route.params.id"
            :dataset="dataset"
            @annotationDone="annotationDone()"
          ></OrgchartAnnotationEditor>
          <br />
        </v-stepper-content>

        <v-stepper-content step="3">
          <OrgchartResult :json="json"></OrgchartResult>

          <v-btn color="primary" @click="e1 = 1"> Save </v-btn>
        </v-stepper-content>
      </v-stepper-items>
    </v-stepper>
  </v-app>
</template>

<script>
import OrgchartEditor from "./../components/OrgchartEditor";
import OrgchartAnnotationEditor from "../components/OrgchartAnnotationEditor";
import OrgchartResult from "../components/OrgchartResult";

export default {
  name: "App",

  components: {
    OrgchartResult,
    OrgchartEditor,
    OrgchartAnnotationEditor,
  },

  methods: {
    parentAssignmentDone: function () {
      this.dataset = this.$refs.orgchart_editor.dataset;
      this.parents = this.$refs.orgchart_editor.parents;
      this.e1 = 2;
    },
    annotationDone: function () {
      this.json = this.generate(null);
      this.e1 = 3;
    },

    generate(e) {
      let elements = [];
      if (e == null) {
        for (let i in this.dataset) {
          console.log(this.dataset[i].id);
          console.log(this.dataset[i].id in this.parents);
          if (!(this.dataset[i].id in this.parents)) {
            elements.push(i);
          }
        }
      } else {
        for (let i in this.dataset) {
          if (
            this.dataset[i].id in this.parents &&
            this.parents[this.dataset[i].id] === e
          ) {
            elements.push(i);
          }
        }
      }
      console.log("children");
      console.log(elements);
      let results = [];
      for (let o in elements) {
        let children = this.generate(this.dataset[elements[o]].id);
        let result = this.dataset[elements[o]];
        if (children.length > 0) {
          result["children"] = children;
        }
        results.push(result);
      }
      return results;
    },
  },

  data: () => ({
    e1: 1,
    dataset: [],
    parents: [],
    json: null,
  }),
};
</script>
