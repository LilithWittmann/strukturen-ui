<template>
  <div>
    <div class="orgchart" v-if="dataset">
      <v-stage
        :config="configKonva"
        ref="stage"
        @mousedown="handleStageMouseDown"
        @touchstart="handleStageMouseDown"
        @mousemove="handleStageMouseMove"
        @touchmove="handleStageMouseMove"
        @mouseup="handleStageMouseUp"
        @touchend="handleStageMouseUp"
        @click="handleSelectElement"
        @tap="handleSelectElement"
      >
        <v-layer ref="background">
          <v-image
            :config="{
              image: backgroundImage,
              listening: false,
            }"
          />
        </v-layer>
        <v-layer ref="items">
          <v-group
            class="grp"
            v-for="item in dataset"
            :key="item.id"
            :config="{ draggable: true, name: 'grp', id: item.id }"
          >
            <v-rect
              :config="{
                x: item.position[0] * 2,
                y: item.position[1] * 2,
                width: (item.position[2] - item.position[0]) * 2,
                height: (item.position[3] - item.position[1]) * 2,
                fill: item.id in parentColors ? parentColors[item.id] : 'white',
                stroke:
                  item.id in parents ? parentColors[parents[item.id]] : 'black',
                strokeWidth: item.id in parents ? 4 : 2,
              }"
            >
            </v-rect>
            <v-text
              :config="{
                x: item.position[0] * 2,
                y: item.position[1] * 2,
                text: item.text,
                fontSize: 12,
                fontFamily: 'Calibri',
                fill: '#555',
                width: (item.position[2] - item.position[0]) * 2,
                padding: 5,
              }"
            ></v-text>
          </v-group>
          <v-rect
            ref="selectionRectangle"
            :config="{
              fill: 'rgba(0,0,255,0.5)',
              visible: false,
            }"
          ></v-rect>
          <v-transformer ref="transformer" />
        </v-layer>
      </v-stage>
    </div>

    <v-sheet
      id="overlay"
      color="white"
      elevation="1"
      height="100"
      width="200"
      v-if="selected.length > 0"
    >
      <div v-if="this.selectParentMode">
        <h3>select parent…</h3>
      </div>
      <div v-else>
        <h3>{{ selected.length }} Elements</h3>
        <input v-on:keyup.tab="selectParentMode = true" />
        <v-btn depressed color="primary" @click="selectParentMode = true">
          assign parent
        </v-btn>
      </div>
    </v-sheet>
  </div>
</template>

<script>
import Konva from "konva";
import "vue-json-pretty/lib/styles.css";

export default {
  name: "OrgchartEditor",
  components: {},
  props: ["id"],
  mounted() {
    this.axios
      .get(
        `http://127.0.0.1:8090/analyze-orgchart/?orgchart_id=${this.$props.id}&page=0`
      )
      .then((response) => (this.dataset = response["data"]["items"]));

    const image = new window.Image();
    image.src = `http://127.0.0.1:8090/orgchart-image/?orgchart_id=${this.$props.id}&page=0`;
    image.onload = () => {
      // set image only when it is loaded
      this.backgroundImage = image;
    };
  },
  methods: {
    handleStageMouseDown(e) {
      // do nothing if we mousedown on any shape
      if (e.target !== e.target.getStage()) {
        return;
      }
      this.selected = [];
      let stage = e.target.getStage();
      this.x1 = stage.getPointerPosition().x;
      this.y1 = stage.getPointerPosition().y;
      this.x2 = stage.getPointerPosition().x;
      this.y2 = stage.getPointerPosition().y;

      let selectionRectangle = this.$refs.selectionRectangle.getNode();

      selectionRectangle.visible(true);
      selectionRectangle.width(0);
      selectionRectangle.height(0);
    },
    handleStageMouseMove(e) {
      let selectionRectangle = this.$refs.selectionRectangle.getNode();
      // no nothing if we didn't start selection
      if (!selectionRectangle.visible()) {
        return;
      }
      let stage = e.target.getStage();
      this.x2 = stage.getPointerPosition().x;
      this.y2 = stage.getPointerPosition().y;

      selectionRectangle.setAttrs({
        x: Math.min(this.x1, this.x2),
        y: Math.min(this.y1, this.y2),
        width: Math.abs(this.x2 - this.x1),
        height: Math.abs(this.y2 - this.y1),
      });
    },

    generateLightColorHex() {
      let color = "#";
      for (let i = 0; i < 3; i++)
        color += (
          "0" +
          Math.floor(((1 + Math.random()) * Math.pow(16, 2)) / 2).toString(16)
        ).slice(-2);
      return color;
    },

    handleStageMouseUp() {
      // no nothing if we didn't start selection
      let selectionRectangle = this.$refs.selectionRectangle.getNode();
      let tr = this.$refs.transformer.getNode();
      let stage = this.$refs.stage.getStage();
      if (!selectionRectangle.visible()) {
        return;
      }
      // update visibility in timeout, so we can check it in click event
      setTimeout(() => {
        selectionRectangle.visible(false);
      });

      console.log(stage);
      var shapes = stage.find(".grp");

      console.log(shapes);
      var box = selectionRectangle.getClientRect();
      console.log(box);
      var selected = shapes.filter((shape) =>
        Konva.Util.haveIntersection(box, shape.getClientRect())
      );
      console.log(selected);
      tr.nodes(selected);
      let ids = [];
      for (let i in selected) {
        ids.push(selected[i].attrs.id);
      }
      this.selected = ids;
    },

    handleSelectElement(e) {
      let tr = this.$refs.transformer.getNode();
      let selectionRectangle = this.$refs.selectionRectangle.getNode();
      let stage = this.$refs.stage.getStage();
      if (selectionRectangle.visible()) {
        return;
      }

      // if click on empty area - remove all selections
      if (e.target === stage) {
        tr.nodes([]);
        this.selected = [];
        return;
      }

      console.log(e.target);
      // do nothing if clicked NOT on our rectangles
      if (!e.target.parent.hasName("grp")) {
        return;
      }

      // do we pressed shift or ctrl?
      const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
      const isSelected = tr.nodes().indexOf(e.target) >= 0;

      console.log("select parent");
      if (this.selectParentMode) {
        this.assignParent(e.target.parent);
      } else if (!metaPressed && !isSelected) {
        // if no key pressed and the node is not selected
        // select just one
        tr.nodes([e.target]);
      } else if (metaPressed && isSelected) {
        // if we pressed keys and node was selected
        // we need to remove it from selection:
        const nodes = tr.nodes().slice(); // use slice to have new copy of array
        // remove node from array
        nodes.splice(nodes.indexOf(e.target), 1);
        tr.nodes(nodes);
      } else if (metaPressed && !isSelected) {
        // add the node into selection
        const nodes = tr.nodes().concat([e.target]);
        tr.nodes(nodes);
      }
    },
    assignParent(parent) {
      let tr = this.$refs.transformer.getNode();
      console.log(parent.attrs.id);
      if (!(parent.attrs.id in this.parentColors)) {
        this.parentColors[parent.attrs.id] = this.generateLightColorHex();
      }
      for (let i in this.selected) {
        this.parents[this.selected[i]] = parent.attrs.id;
      }
      this.selectParentMode = false;
      this.selected = [];
      tr.nodes([]);
      console.log(this.parents);
    },
  },
  watch: {
    dataset: function (val) {
      let max_height = this.configKonva.height;
      let max_width = this.configKonva.width;
      for (let i in val) {
        console.log(val[i]);
        if (max_width < val[i].position[2] * 2 + 200) {
          max_width = val[i].position[2] * 2 + 200;
        }
        if (max_height < val[i].position[3] * 2 + 200) {
          max_height = val[i].position[3] * 2 + 200;
        }
      }
      console.log("max width/height changed");
      console.log(max_width);
      console.log(max_height);
      this.configKonva = {
        width: max_width,
        height: max_height,
      };
    },
  },
  data() {
    return {
      x1: null,
      x2: null,
      y1: null,
      y2: null,
      json: null,

      parents: {},
      parentColors: {},
      selected: [],
      selectParentMode: false,

      dataset: null,
      backgroundImage: null,
      configKonva: {
        width: 4000,
        height: 1400,
      },
    };
  },
};
</script>

<style scoped>
.orgchart {
  margin: 0;
  padding: 0;
  background-color: #f0f0f0;
  height: 100%;
  overflow: auto;
}
#overlay {
  position: fixed;
  bottom: 20px;
  left: 20px;
  padding: 10px;
}
</style>
