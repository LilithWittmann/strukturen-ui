<template>
  <div>
    <div class="orgchart">
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
        <v-layer>
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
                fontSize: 14,
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
        <v-btn depressed color="primary" @click="selectParentMode = true">
          assign parent
        </v-btn>
      </div>
    </v-sheet>

    <v-btn depressed color="primary" @click="json = generate(null)"
      >generate JSON</v-btn
    >
    <vue-json-pretty :path="'res'" :data="json"> </vue-json-pretty>
  </div>
</template>

<script>
import Konva from "konva";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";

export default {
  name: "OrgchartEditor",
  components: {
    VueJsonPretty,
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

      dataset: [
        {
          id: "5e04bf1c-c3e5-4750-b7b0-4ea99d32aa65",
          position: [50.04, 130.94, 193.7, 148.34],
          text: "\u00d6rtlicher Personalrat\nVorsitzender OAR St\u00fcmpflen 5566\nHauptpersonalrat",
        },
        {
          id: "f3d403c2-97df-40fa-a94d-eefd3bdb6f46",
          position: [425.47, 136.7, 547.99, 148.34],
          text: "Staatssekret\u00e4r",
        },
        {
          id: "b24d17eb-a48b-4a68-91a1-8c9c2432be9d",
          position: [50.04, 148.22, 193.7, 154.1],
          text: "Vorsitzende Frau Bair 3991",
        },
        {
          id: "a239b353-2e3c-46f6-a330-3c76afc588e6",
          position: [298.49, 148.22, 420.07, 154.1],
          text: "Amtschef",
        },
        {
          id: "f11ae2d3-3a50-4a15-96a3-53d45505f827",
          position: [553.39, 148.22, 674.97, 154.1],
          text: "Beauftragter der Landesregierung f\u00fcr",
        },
        {
          id: "66aec941-82fe-4d5f-9d06-49373577d76e",
          position: [50.04, 153.98, 193.7, 159.86],
          text: "Vertrauensperson der Schwerbehinderten beim Innenministerium",
        },
        {
          id: "e4d1c58d-8058-4f9e-8297-3e1ec0f37832",
          position: [298.49, 153.98, 420.07, 159.86],
          text: "Amtschef",
        },
        {
          id: "7d23d197-f266-47ea-8781-db44e8642044",
          position: [553.39, 153.98, 674.97, 159.86],
          text: "BeauftIrnafgotremr adteior nLsatnedcehsnroelgoigeireung f\u00fcr",
        },
        {
          id: "657d0a58-37bc-4db2-b0c2-6faad3df97a6",
          position: [50.04, 159.74, 193.7, 165.62],
          text: "Frau H\u00e4ntsch 3995",
        },
        {
          id: "5b2c325f-f65c-4e56-b6b5-391866ff37ed",
          position: [425.47, 159.74, 547.99, 165.62],
          text: "Wilfried Klenk MdL 3005",
        },
        {
          id: "3ae2e97e-1c20-4dad-80e9-c113ef1de406",
          position: [553.39, 159.74, 674.97, 165.62],
          text: "Informationstechnologie",
        },
        {
          id: "012280c8-02c4-4f56-872b-6abd4e882a9e",
          position: [50.04, 165.5, 193.7, 171.38],
          text: "Hauptvertrauensperson der Schwerbehinderten",
        },
        {
          id: "256b7985-1f58-483d-b7b2-ca5d900c662b",
          position: [44.52, 171.26, 199.22, 177.14],
          text: "OAR Hahn 3993",
        },
        {
          id: "ec31a494-746b-4577-92e1-bc6cfe866dd0",
          position: [298.49, 171.26, 420.07, 177.14],
          text: "MDgt. Andreas Sch\u00fctze 3010",
        },
        {
          id: "dc4a9dfe-47b0-469e-9822-a71c21adeafb",
          position: [436.51, 171.26, 520.39, 177.14],
          text: "Pers\u00f6nliche Referentin",
        },
        {
          id: "8eacaec7-3e13-49ad-8ab2-5a6b56d5864f",
          position: [553.39, 171.26, 674.97, 177.14],
          text: "MD Stefan Krebs 5200",
        },
        {
          id: "a5afb91c-6ed0-4bfe-bf61-578301bc7b0a",
          position: [204.62, 177.02, 386.92, 182.9],
          text: "Beh\u00f6rdlicher",
        },
        {
          id: "5c3c322f-0c7e-40ef-b6bb-24725a20d087",
          position: [204.62, 182.78, 287.564, 188.66],
          text: "Datenschutzbeauftragter",
        },
        {
          id: "e3106057-7ab4-4847-a72b-9e6376c62a05",
          position: [575.5, 182.78, 658.42, 188.66],
          text: "Koordinierungsstelle CIO",
        },
        {
          id: "08cf1def-a25e-4ea3-8d93-c7176d1d4247",
          position: [204.62, 188.546, 287.564, 194.45],
          text: "RD Kl\u00f6pfer 3257",
        },
        {
          id: "00c867b2-caf6-4785-ab9c-29ee76366c56",
          position: [39.0, 223.13, 99.864, 228.41],
          text: "RD'in Gassner",
        },
        {
          id: "bbd18970-61bb-4536-ab2b-2cc6c6b02ac8",
          position: [696.94, 223.13, 757.804, 228.41],
          text: "MR Dr. Fritzsch",
        },
        {
          id: "06aa9049-6494-4459-9bc2-1b6c1015375f",
          position: [94.224, 252.29, 171.624, 258.41],
          text: "Abteilung 1",
        },
        {
          id: "f75c6daf-dddd-47c6-948f-de9b5b8934e2",
          position: [182.54, 252.29, 259.964, 258.41],
          text: "Abteilung 2",
        },
        {
          id: "d5e0519b-b4e1-45b1-a7c4-d1310ef9eff3",
          position: [270.89, 252.29, 348.29, 258.41],
          text: "Abteilung 3",
        },
        {
          id: "b2455bcf-b7ad-4c09-bc03-7ff1602f8b93",
          position: [359.21, 252.29, 436.634, 258.41],
          text: "Abteilung 4",
        },
        {
          id: "9bae9059-8495-493d-b4d6-317d137fa911",
          position: [447.55, 252.29, 525.91, 258.41],
          text: "Abteilung 5",
        },
        {
          id: "a32b145f-cebe-454a-a082-71ac71b749a2",
          position: [536.83, 252.29, 614.254, 258.41],
          text: "Abteilung 6",
        },
        {
          id: "cd308c89-efa8-4df0-8fbe-688daae7e533",
          position: [625.18, 252.29, 702.58, 258.41],
          text: "Abteilung 7",
        },
        {
          id: "b208ea4f-22d5-4610-9d26-97b36380d963",
          position: [94.224, 258.29, 171.624, 263.09],
          text: "Personal, Finanzen, Organisation,",
        },
        {
          id: "df3f717f-4fe1-4d1a-8b8f-ddc72df064b3",
          position: [182.54, 258.29, 259.964, 263.09],
          text: "Verfassung, Kommunales, Recht",
        },
        {
          id: "cb600dad-1547-4c55-bfb0-82f517d6bc8b",
          position: [270.89, 258.29, 348.29, 263.09],
          text: "Landespolizeipr\u00e4sidium",
        },
        {
          id: "819c58f5-74f5-4ced-b587-3bf2a94a88d5",
          position: [359.21, 258.29, 436.634, 263.09],
          text: "Ausl\u00e4nder und Fl\u00fcchtlinge, Migration,",
        },
        {
          id: "5df2b15e-f626-48cd-98c6-1cecefe68bde",
          position: [447.55, 258.29, 525.91, 263.09],
          text: "IT, E-Government,",
        },
        {
          id: "7885543e-7fff-4ec1-9426-e963e8eef575",
          position: [536.83, 258.29, 614.254, 263.09],
          text: "Bev\u00f6lkerungsschutz und",
        },
        {
          id: "0df844bf-56d3-4a2d-9553-ddace1e9faf7",
          position: [625.18, 258.29, 702.58, 263.09],
          text: "Digitalisierung",
        },
        {
          id: "2991be00-8790-4e14-b1d5-625723d8fe0a",
          position: [94.224, 262.97, 171.624, 267.77],
          text: "Personal, FDiniaennzsetrne,c Ohtrganisation,",
        },
        {
          id: "6f448619-4ba0-4b53-bd30-b9b3bd6b498f",
          position: [182.54, 262.97, 259.964, 267.77],
          text: "Verfassung, Kommunales, Recht",
        },
        {
          id: "b8c39db7-b178-496a-87e1-0e89600e4894",
          position: [270.89, 262.97, 348.29, 267.77],
          text: "Landespolizeipr\u00e4sidium",
        },
        {
          id: "53c12025-b04c-4951-a398-c61173ac3d95",
          position: [359.21, 262.97, 436.634, 267.77],
          text: "Ausl\u00e4Vnedrefar susnudn Fgsl\u00fcscchhtulintzg, e ,K Mulitgurration,",
        },
        {
          id: "7a69903f-730c-4327-9830-998913987b3c",
          position: [447.55, 262.97, 525.91, 267.77],
          text: "VerwIaTl,t uEn-gGsomveordnemrneisnite, rung",
        },
        {
          id: "3fd3dcf8-1729-4806-905a-27058b6046be",
          position: [536.83, 262.97, 614.254, 267.77],
          text: "BeKv\u00f6rilskeenrumnagnsasgcehmutez nutnd",
        },
        {
          id: "86019f93-8fb5-4247-a742-0650d64aef8b",
          position: [625.18, 262.97, 702.58, 267.77],
          text: "Digitalisierung",
        },
        {
          id: "1fc886c7-6060-4cf6-b65a-64bcdca9f15b",
          position: [94.224, 267.65, 171.624, 272.45],
          text: "Dienstrecht",
        },
        {
          id: "ea69f6b7-665a-463e-89b1-2904c7f08ddf",
          position: [359.21, 267.65, 436.634, 272.45],
          text: "undV Geerfsacshsiucnhgtes sdcehr uDtze,u  tKsuchltuern im",
        },
        {
          id: "57743f44-f491-4e8a-ab15-fe411240a3d7",
          position: [447.55, 267.65, 525.91, 272.45],
          text: "Verwaltungsmodernisierung",
        },
        {
          id: "55bd0aa5-dc3b-4497-9c17-84b821a472ca",
          position: [536.83, 267.65, 614.254, 272.45],
          text: "Krisenmanagement",
        },
        {
          id: "ae28d7a5-85ff-48ce-abae-56f79c883c42",
          position: [359.21, 272.33, 436.634, 277.13],
          text: "und Gesc\u00f6hsitclihchtee nd eEr uDroepuatschen im",
        },
        {
          id: "63f6ab25-b079-4d3c-9497-c8fcaec71172",
          position: [359.21, 277.01, 436.634, 281.81],
          text: "\u00f6stlichen Europa",
        },
        {
          id: "209a5dbb-c130-47da-9154-22b361e74838",
          position: [94.224, 281.69, 155.064, 287.57],
          text: "MDgt. Dr. Klee",
        },
        {
          id: "fc1c8be0-1eea-4f29-9519-215332e407d7",
          position: [182.54, 281.69, 243.404, 287.57],
          text: "MDgt. Jochimsen",
        },
        {
          id: "2de25a3d-d75a-4625-826c-9866b80a54df",
          position: [270.89, 281.69, 331.73, 287.57],
          text: "LPP'in Dr. Hinz",
        },
        {
          id: "45dbd137-a65e-4bbd-bcdf-58d232486777",
          position: [359.21, 281.69, 420.074, 287.57],
          text: "MDgt. Dr. Lehr",
        },
        {
          id: "e1c48adc-1f62-49b0-bee4-1466d30aa6f0",
          position: [447.55, 281.69, 509.35, 287.57],
          text: "MDgt. Rommel",
        },
        {
          id: "f7193f52-f68f-4106-a325-47e7276068ae",
          position: [536.83, 281.69, 597.694, 287.57],
          text: "MDgt. Prof. Schr\u00f6der",
        },
        {
          id: "04257c43-9e95-4647-ba93-12e1e6127fb4",
          position: [625.18, 281.69, 674.98, 287.57],
          text: "MDgt. Wurster",
        },
        {
          id: "eeda2d9d-dec1-4a0e-9439-838521d6fb41",
          position: [94.224, 287.45, 171.624, 293.33],
          text: "Referat 11",
        },
        {
          id: "1b640751-17c4-4245-a15a-83b40831e1e4",
          position: [182.54, 287.45, 259.964, 293.33],
          text: "Referat 21",
        },
        {
          id: "c5c2eba3-17cb-4868-8eb7-aa8ea84832d0",
          position: [270.89, 287.45, 348.29, 293.33],
          text: "Stabsstelle",
        },
        {
          id: "e67fea64-4b3a-486a-8013-30c837e4f8da",
          position: [359.21, 287.45, 436.634, 293.33],
          text: "Referat 41",
        },
        {
          id: "c3d71540-22f0-4d76-9abb-99734da66850",
          position: [447.55, 287.45, 525.91, 293.33],
          text: "Referat 51",
        },
        {
          id: "e0fd91db-903d-4c36-a7bb-51c87281f115",
          position: [536.83, 287.45, 614.254, 293.33],
          text: "Referat 61",
        },
        {
          id: "7646bb18-6f51-44ee-833e-6d24afb557c1",
          position: [625.18, 287.45, 702.58, 293.33],
          text: "Referat 71",
        },
        {
          id: "c56d052b-a6df-4f9d-84f7-908cac77cf64",
          position: [94.224, 293.21, 171.624, 298.01],
          text: "Personalrecht, Ausbildung",
        },
        {
          id: "4ab6dce5-f6ea-44b9-b123-1816604783a4",
          position: [182.54, 293.21, 259.964, 298.01],
          text: "Verfassung, Parlamentswahlen, Recht",
        },
        {
          id: "b9f2d3bc-61da-4a76-af66-a8990dd9d9ec",
          position: [270.89, 293.21, 348.29, 298.01],
          text: "\u00d6ffentlichkeitsarbeit der Polizei",
        },
        {
          id: "c60d5a70-3bba-4c6f-a01b-b4acd5ce2115",
          position: [359.21, 293.21, 436.634, 298.01],
          text: "Kultur und Geschichte der Deutschen",
        },
        {
          id: "60ad73e2-33b5-4ebc-b435-310e199e0be3",
          position: [447.55, 293.21, 525.91, 298.01],
          text: "IT-Koordination",
        },
        {
          id: "f939b963-a7fd-4700-836e-ea1a366a84ca",
          position: [536.83, 293.21, 614.254, 298.01],
          text: "Technik und Haushalt",
        },
        {
          id: "ae8b8615-b5f4-4e38-bbfd-d155e2ce608d",
          position: [625.18, 293.21, 702.58, 298.01],
          text: "Haushalt und Recht",
        },
        {
          id: "c845ce77-c0df-4ffa-aa05-084e5e7c78fe",
          position: [94.224, 297.89, 171.624, 307.37],
          text: "Personalrecht, Ausbildung",
        },
        {
          id: "e59f4da3-e384-4442-a6ea-902a37d01296",
          position: [182.54, 297.89, 259.964, 307.37],
          text: "Verfassung, Parlamentswahlen, Recht",
        },
        {
          id: "96c71352-2f0a-48dd-9b14-89add47d080c",
          position: [270.89, 297.89, 348.29, 307.37],
          text: "\u00d6ffentluicnhdk Keiotsoardrbineiiet rduenrg Polizei",
        },
        {
          id: "a54d7f86-d1d0-446d-9596-80bf358dbc7c",
          position: [359.21, 297.89, 436.634, 307.37],
          text: "Kultur unidm G \u00f6esstlicchhiechnt eE udreorp Dae,utschen \nQuerschittsaufgaben der Abteilung",
        },
        {
          id: "9d97f6c6-85ea-4180-956b-0ddeec93b1d5",
          position: [447.55, 297.89, 525.91, 307.37],
          text: "IT-Koordination",
        },
        {
          id: "6d8a9d09-bf23-446b-9ad4-695838443f2d",
          position: [536.83, 297.89, 614.254, 307.37],
          text: "Technik und Haushalt",
        },
        {
          id: "c86edd6d-f29c-4467-b386-f908deab02dd",
          position: [625.18, 297.89, 702.58, 307.37],
          text: "Haushalt und Recht",
        },
        {
          id: "b7ba2855-37f1-480f-9a2e-d4e91f57cd53",
          position: [94.224, 307.246, 171.624, 323.35],
          text: "MR'in Dr. Kontusch 3110\nReferat 12",
        },
        {
          id: "f65cbe85-e0a3-41ea-a961-5ac6bac6bb05",
          position: [182.54, 307.246, 259.964, 323.35],
          text: "MR'in Nesch 3210\nReferat 22",
        },
        {
          id: "5a2b499d-d90c-41ff-9205-bfc59cad37fe",
          position: [270.89, 307.246, 348.29, 323.35],
          text: "POR Reusch 5310\nInspekteur der Polizei",
        },
        {
          id: "d04d6f4f-e402-438f-adc5-bfcf6f06f64e",
          position: [359.21, 307.246, 436.634, 323.35],
          text: "Querschittsaufgaben der Abteilung\nLMR'in Dr. Meis 3410\nReferat 42",
        },
        {
          id: "baaae005-aef6-4d16-824f-3ed217d0bd2f",
          position: [447.55, 307.246, 525.91, 323.35],
          text: "MR Dr. Hermann 3510\nReferat 52",
        },
        {
          id: "620a980d-8793-4b9a-a96c-17619cf3bb48",
          position: [536.83, 307.246, 614.254, 323.35],
          text: "MR Niebling 5410\nReferat 62",
        },
        {
          id: "c8f5a7c3-9708-4152-89ee-5573670870ad",
          position: [625.18, 307.246, 702.58, 323.35],
          text: "MR'in Hahn 3710\nReferat 72",
        },
        {
          id: "eea19936-897b-448f-965f-9311d94587f7",
          position: [94.224, 323.23, 171.624, 328.03],
          text: "Personal - Strategische Planung,",
        },
        {
          id: "e7d64db1-4c56-4640-80d1-b49dd6fbd342",
          position: [182.54, 323.23, 259.964, 328.03],
          text: "Kommunales Verfassungsrecht und",
        },
        {
          id: "e4a0bec7-ff8e-442c-83c6-99097d8e8859",
          position: [359.21, 323.23, 436.634, 328.03],
          text: "Erstaufnahme von Fl\u00fcchtlingen",
        },
        {
          id: "1a6b914b-2118-490e-8335-fe5e11b5a48c",
          position: [536.83, 323.23, 614.254, 328.03],
          text: "Feuerwehr und Brandschutz",
        },
        {
          id: "0c8e357d-43fe-4629-b3ee-b3dac6bef836",
          position: [625.18, 323.23, 702.58, 328.03],
          text: "Digitalisierungsstrategie und",
        },
        {
          id: "b6e65dc6-8d18-4cfd-bfd7-1e2a59ffcdd1",
          position: [94.224, 327.91, 171.624, 337.39],
          text: "Perhs\u00f6ohnearle -r  SDtireantesgt,i sFcohretb Pildlaunnugng,",
        },
        {
          id: "52b6980a-593e-4a35-9672-8076458d0241",
          position: [182.54, 327.91, 259.964, 337.39],
          text: "KommunalesD Vieenrsfatrsescuhntgsrecht und",
        },
        {
          id: "d716cc3f-c30f-43ad-a476-9f10cde04847",
          position: [359.21, 327.91, 436.634, 337.39],
          text: "Erstaufnahme von Fl\u00fcchtlingen",
        },
        {
          id: "7ec6b785-8dd1-4b11-bc5a-5fef5ce65e8a",
          position: [447.55, 327.91, 525.91, 337.39],
          text: "E-Government, Open Government, \nVerwaltungsmodernisierung",
        },
        {
          id: "4a1f4a0a-46a3-4c33-8d19-055a440ae7dd",
          position: [536.83, 327.91, 614.254, 337.39],
          text: "Feuerwehr und Brandschutz",
        },
        {
          id: "bf0c360e-9d75-461b-87d0-e57ee642a0dc",
          position: [625.18, 327.91, 702.58, 337.39],
          text: "DigitaliCsiyebruenrsgicshsterarhteegitie und",
        },
        {
          id: "89a9dc5a-fdc9-4040-ab4e-ca6e2b101424",
          position: [270.89, 337.27, 348.29, 342.07],
          text: "IdP Renner, A. 3310",
        },
        {
          id: "df7d256d-e4eb-48fd-9505-42c76d69f8f6",
          position: [447.55, 337.27, 525.91, 342.07],
          text: "Verwaltungsmodernisierung",
        },
        {
          id: "c3825a53-86f9-4bb9-b8b9-537845b3a3ef",
          position: [270.89, 341.95, 348.29, 346.75],
          text: "IdP Renner, A. 3310",
        },
        {
          id: "d5903c72-edc8-4ba1-b295-ce0070660c0d",
          position: [94.224, 346.63, 155.064, 352.39],
          text: "MR Math\u00e4s",
        },
        {
          id: "d5a2c60e-471e-4a80-8f3c-11564f161c2c",
          position: [182.54, 346.63, 243.404, 352.39],
          text: "MR Armbruster",
        },
        {
          id: "08c2c4b3-e387-4707-ab30-adf374deec95",
          position: [270.89, 346.63, 348.29, 352.39],
          text: "Referat 31",
        },
        {
          id: "eb55b4c1-b0dc-49e6-8634-a2f4a78f05dc",
          position: [359.21, 346.63, 409.034, 352.39],
          text: "MR Kleinschmidt",
        },
        {
          id: "7b6b8516-5ec5-4ed8-884d-fd3e5c2204b7",
          position: [447.55, 346.63, 509.35, 352.39],
          text: "MR Dr. Z\u00fcgel",
        },
        {
          id: "639d3a0d-db54-445c-83ea-101d449656fa",
          position: [536.83, 346.63, 597.694, 352.39],
          text: "LBrD Egelhaaf",
        },
        {
          id: "8ae4e8f9-acce-4162-8996-fe2d3877ddd7",
          position: [625.18, 346.63, 674.98, 352.39],
          text: "LMR Pr\u00f6frock",
        },
        {
          id: "0e30864d-ff82-4541-a865-ef3016b990a1",
          position: [94.224, 352.27, 171.624, 376.75],
          text: "Referat 13\nPersonal - gehobener und mittlerer \nDienst, Stelen, Tarifrecht",
        },
        {
          id: "ab3d4c39-741d-4ac6-9576-36b924c6af5b",
          position: [182.54, 352.27, 259.964, 376.75],
          text: "Referat 23\nKommunalwirtschaft, \nKommunalfinanzen",
        },
        {
          id: "91ecc954-c55d-4aed-a2ba-3933d0941716",
          position: [270.89, 352.27, 348.29, 376.75],
          text: "Einsatz, Lagezentrum, Verkehr",
        },
        {
          id: "f2b9ab7b-7f28-47e6-89d9-3e042bb32802",
          position: [359.21, 352.27, 436.634, 376.75],
          text: "Referat 43\nFl\u00fcchtlingsaufnahme in Kreisen und \nKommunen",
        },
        {
          id: "f81565a6-d3f4-497a-960c-0e09c444e3f4",
          position: [447.55, 352.27, 525.91, 376.75],
          text: "Referat 53\nIT-Recht, Vergabewesen, \nVerwaltungsstruktur",
        },
        {
          id: "25868c41-245b-44e3-a0a6-948a214dbdbc",
          position: [536.83, 352.27, 614.254, 376.75],
          text: "Referat 63\nRettungsdienst",
        },
        {
          id: "4505c604-eb92-4d29-b817-68abae8a029e",
          position: [94.224, 376.63, 155.064, 382.39],
          text: "MR Hansmann",
        },
        {
          id: "8394b4a3-ef02-4a00-bfab-764d271186b8",
          position: [182.54, 376.63, 243.404, 382.39],
          text: "MR'in Dr. M\u00fcller, S.",
        },
        {
          id: "eed9c84e-1205-4ec7-8f83-c439cfd71b59",
          position: [270.89, 376.63, 331.73, 382.39],
          text: "LPD Feigl",
        },
        {
          id: "c0f5e0fd-f98b-4851-a91a-a216e4f69009",
          position: [359.21, 376.63, 409.034, 382.39],
          text: "MR'in Rung, K.",
        },
        {
          id: "d2fa02cb-f60a-4f00-9fe7-32a39d7682a7",
          position: [447.55, 376.63, 509.35, 382.39],
          text: "LMR Zimmer",
        },
        {
          id: "9fbfe305-1326-4790-b2e8-130f330ffe34",
          position: [536.83, 376.63, 597.694, 382.39],
          text: "MR'in Rumler",
        },
        {
          id: "f34ff573-81e3-4db7-92b0-6d5c6ce7f95e",
          position: [94.224, 382.27, 171.624, 388.15],
          text: "Referat 14",
        },
        {
          id: "04015d05-e501-4eb8-95e3-f3e6892ad529",
          position: [182.54, 382.27, 259.964, 388.15],
          text: "Referat 24",
        },
        {
          id: "f699c63e-6c54-4495-b4ba-87bcf69b7fc1",
          position: [359.21, 382.27, 436.634, 388.15],
          text: "Referat 44",
        },
        {
          id: "588df2ad-8fb7-4012-b72d-9fbf877a9d76",
          position: [447.55, 382.27, 525.91, 388.15],
          text: "Referat 54",
        },
        {
          id: "4ff2a8f5-566f-48bc-937b-154b6e059b86",
          position: [536.83, 382.27, 614.254, 388.15],
          text: "Referat 64",
        },
        {
          id: "70b7ca02-1ae7-410f-9d2e-75d228487856",
          position: [94.224, 388.03, 171.624, 406.87],
          text: "Finanzen, Controling, Steuern",
        },
        {
          id: "93033112-7c54-4719-a43f-3e168eeae312",
          position: [182.54, 388.03, 259.964, 406.87],
          text: "Sparkassenwesen",
        },
        {
          id: "4333354e-a5c9-4fbf-9ba0-ac3c17a9783d",
          position: [270.89, 388.03, 348.29, 406.87],
          text: "Referat 32\nKriminalit\u00e4tsbek\u00e4mpfung, Pr\u00e4vention, \nKriminologie",
        },
        {
          id: "da101205-2037-4da7-8a42-84f5dd575141",
          position: [359.21, 388.03, 436.634, 406.87],
          text: "Verfassungsschutz, \n\u00d6ffentliches Vereinsrecht",
        },
        {
          id: "a5f194eb-92f3-4cb7-bf5e-b20b1278186a",
          position: [447.55, 388.03, 525.91, 406.87],
          text: "IT-Leitstele, \nLandeseinheitliche E-Akte",
        },
        {
          id: "9ed4a85a-763d-478c-a22a-2e5134009f97",
          position: [536.83, 388.03, 614.254, 406.87],
          text: "Katastrophenschutz",
        },
        {
          id: "f15c54e2-49a1-4fcb-b208-050f88fa89f1",
          position: [94.224, 406.75, 155.064, 412.51],
          text: "MR Dr. M\u00f6ser",
        },
        {
          id: "929b4f13-e36c-4468-aab6-a7772e0ac6e9",
          position: [182.54, 406.75, 243.404, 412.51],
          text: "LMR Dr. Pope",
        },
        {
          id: "9cd46169-7825-4e7b-a220-bbd249939a61",
          position: [359.21, 406.75, 420.074, 412.51],
          text: "MR Dr. Schn\u00f6ckel",
        },
        {
          id: "002b1401-aeea-4520-aaf0-20d8ebf0b448",
          position: [447.55, 406.75, 525.91, 412.51],
          text: "MR'in Dr. Oellers 3570",
        },
        {
          id: "48fb8f3f-3226-4d0d-babb-1a6915511539",
          position: [536.83, 406.75, 597.694, 412.51],
          text: "LMR Gl\u00e4ser",
        },
        {
          id: "76b1b66c-eb8a-4271-b43f-7985bb4299fd",
          position: [94.224, 412.39, 171.624, 418.15],
          text: "Referat 15",
        },
        {
          id: "f8488695-333a-4984-9046-2b352f52d38e",
          position: [182.54, 412.39, 259.964, 418.15],
          text: "Referat 25",
        },
        {
          id: "f650ba6d-ed69-4c5f-821b-f6804ddc2661",
          position: [359.21, 412.39, 436.634, 418.15],
          text: "Referat 45",
        },
        {
          id: "4606e785-b85b-4dc3-89dd-691f1faa0fe9",
          position: [447.55, 412.39, 525.91, 418.15],
          text: "Referat 55 3570",
        },
        {
          id: "e49f1525-113a-4592-8da0-fa0078260bb6",
          position: [536.83, 412.39, 614.254, 418.15],
          text: "Referat 65",
        },
        {
          id: "09c19f42-4222-4dd5-9f5d-abea67a9a6a0",
          position: [94.224, 418.036, 171.624, 443.5],
          text: "Organisation",
        },
        {
          id: "3444f1a4-1ccd-4f97-b0b3-614ad35a7f56",
          position: [182.54, 418.036, 259.964, 443.5],
          text: "Datenschutz, \nInformationsfreiheitsgesetz, \nPersonenstandsrecht und andere \nRechtsgebiete",
        },
        {
          id: "d958c7cd-0970-44ee-9bc5-8588523098d3",
          position: [359.21, 418.036, 436.634, 443.5],
          text: "Aufenthaltsrecht, Asylrecht",
        },
        {
          id: "c00a3f6a-9055-4ee8-a54d-be0132a5b0a5",
          position: [447.55, 418.036, 525.91, 443.5],
          text: "IT-Sicherheit",
        },
        {
          id: "0922508b-7863-4372-90bf-602b0f78f730",
          position: [536.83, 418.036, 614.254, 443.5],
          text: "Krisenmanagement",
        },
        {
          id: "28f685c2-470c-46a4-ad2a-78a8ec2457ab",
          position: [94.224, 443.38, 155.064, 449.14],
          text: "MR Straile",
        },
        {
          id: "d447101d-ef3a-4de3-a5de-172229be077f",
          position: [182.54, 443.38, 243.404, 449.14],
          text: "MR Poymann",
        },
        {
          id: "f11abc75-2032-45ef-b17e-07f524d63d7d",
          position: [359.21, 443.38, 420.074, 449.14],
          text: "MR'in Graf",
        },
        {
          id: "62e2a4dc-9b16-4de4-81af-37c42b2243b6",
          position: [447.55, 443.38, 509.35, 449.14],
          text: "MR Wellh\u00e4u\u00dfer",
        },
        {
          id: "c9d764e4-2408-4dcd-899c-a66a714a5d0d",
          position: [536.83, 443.38, 597.694, 449.14],
          text: "MR Willms",
        },
        {
          id: "0e456178-6f04-42b5-8395-4851281b0168",
          position: [182.54, 449.02, 259.964, 454.9],
          text: "Referat 26",
        },
        {
          id: "c02fd698-4990-4090-9226-38484800f6a1",
          position: [270.89, 449.02, 331.73, 454.9],
          text: "LKD Ziwey\nReferat 33",
        },
        {
          id: "c0181a32-a534-4fec-8546-0f04670d7dfd",
          position: [359.21, 449.02, 436.634, 454.9],
          text: "Referat 46",
        },
        {
          id: "edc81bf7-48a3-4c85-b9d8-cc5e810c668d",
          position: [182.54, 454.78, 259.964, 459.58],
          text: "Gl\u00fccksspielrecht, Melderecht",
        },
        {
          id: "371ae4b3-7adf-44c5-b325-6a708c5a3129",
          position: [270.89, 454.78, 348.29, 459.58],
          text: "Referat 33",
        },
        {
          id: "6796b1be-624b-4ba8-badc-bf7c48e78ef6",
          position: [359.21, 454.78, 436.634, 459.58],
          text: "Staatsangeh\u00f6rigkeit, Gesch\u00e4ftsstelen der",
        },
        {
          id: "9e45d285-a7a9-4e24-b190-8f04c5e9d811",
          position: [182.54, 459.46, 259.964, 464.26],
          text: "Gl\u00fccksspielrecht, Melderecht",
        },
        {
          id: "6b051c5c-ea1d-416f-a75c-c451b1ed599f",
          position: [270.89, 459.46, 348.29, 464.26],
          text: "Personal- und",
        },
        {
          id: "fafaae10-74f0-467a-90c4-02c68c94cb33",
          position: [359.21, 459.46, 436.634, 464.26],
          text: "StaatsHan\u00e4grteehfa\u00f6lrikgokmeimt, iGsseioscnh u\u00e4nftds sdteerl en der",
        },
        {
          id: "ad9332b3-6bcf-4f9f-9048-f5a2eb230ecc",
          position: [270.89, 464.14, 348.29, 468.94],
          text: "OrganiPsaetrisoonnsaml-a unnadg ement",
        },
        {
          id: "d8b1acad-4340-4e8f-888d-9ee1e07dfef8",
          position: [359.21, 464.14, 436.634, 468.94],
          text: "H\u00e4rtefaOlmkobmumdsispseirosno nund der",
        },
        {
          id: "b9a52c13-98ab-4bcc-8899-f566c3247d33",
          position: [270.89, 468.82, 348.29, 473.62],
          text: "Organisationsmanagement",
        },
        {
          id: "5e3661b3-0ae6-4ae3-a0ae-c8a048e5f298",
          position: [359.21, 468.82, 436.634, 473.62],
          text: "Ombudsperson",
        },
        {
          id: "f5eefc01-7c36-431c-8f7a-0b506d2ea2b6",
          position: [182.54, 479.14, 243.404, 484.9],
          text: "MR'in Cremer",
        },
        {
          id: "c9ebf885-1e3c-4f08-9150-556328758bc5",
          position: [270.89, 479.14, 331.73, 484.9],
          text: "LMR Moser von Filseck",
        },
        {
          id: "cf8f21ad-bb3f-424c-82ca-8734bf9531fc",
          position: [359.21, 479.14, 409.034, 484.9],
          text: "MR'in H\u00fcfner",
        },
        {
          id: "b5430ff9-d6c3-4219-a616-8ee2b5580fd2",
          position: [270.89, 484.78, 348.29, 490.54],
          text: "Referat 34",
        },
        {
          id: "bee62b9f-4f88-4efb-b006-abdd6f1aeb72",
          position: [270.89, 490.416, 348.29, 495.216],
          text: "Haushaltsmanagement, Technik und",
        },
        {
          id: "7d18c8ed-48d5-421d-8acc-b6f75500eea7",
          position: [270.89, 495.096, 348.29, 520.416],
          text: "HaushaltsmLaiengaegnesmcheanftt,e Tnechnik und",
        },
        {
          id: "7d5f0fb7-41cb-4fdc-b782-e2f4dc5897cc",
          position: [270.89, 520.296, 331.73, 525.936],
          text: "MR Scholz",
        },
        {
          id: "d960eaf3-3bea-4ed6-8c5d-27858cccc78d",
          position: [270.89, 525.816, 348.29, 531.456],
          text: "Referat 35",
        },
        {
          id: "7d39e766-06d4-4a55-bad7-f799f826f801",
          position: [270.89, 531.336, 348.29, 536.136],
          text: "Recht, Grundsatz und Europ\u00e4ische",
        },
        {
          id: "91e80c9d-6c28-4f35-942f-e0ae3222791e",
          position: [270.89, 536.016, 348.29, 543.216],
          text: "Recht, GrAunngdeslaetgze unnhde iEteunrop\u00e4ische",
        },
        {
          id: "a24848fa-29dd-4b82-a468-bd920f90d338",
          position: [270.89, 559.416, 331.73, 565.176],
          text: "MR Frank",
        },
        {
          id: "79ff7683-f036-4416-9c58-24ffe34d3dfa",
          position: [720.24, 100.7, 756.84, 101.06],
          text: "Stand: 01.05.2021",
        },
        {
          id: "35a117d3-5b1c-4c9b-b84f-e586e1c96e5c",
          position: [326.33, 89.66, 408.794, 90.02],
          text: "3003",
        },
        {
          id: "84fcd9a3-ab73-42d1-892c-e10bfdf6fd9f",
          position: [426.07, 124.7, 548.47, 125.78],
          text: "Thomas Strobl 3001",
        },
        {
          id: "0d7cb3f5-53d3-49cf-a47f-1b6a061a3688",
          position: [425.71, 165.38, 485.83, 165.74],
          text: "Wilfried Klenk MdL",
        },
        {
          id: "c1fcb769-da98-4d2b-afff-073aa81c6ca8",
          position: [392.69, 176.9, 420.194, 177.26],
          text: "3010",
        },
        {
          id: "306740be-6a3c-4890-8d79-7ae608baff71",
          position: [553.63, 176.9, 619.294, 177.26],
          text: "MD Stefan Krebs",
        },
        {
          id: "a95093b5-20cf-42d0-a94b-c30763daf05a",
          position: [39.6, 227.81, 116.904, 228.89],
          text: "RD'in Gassner 5460",
        },
        {
          id: "f217883d-064a-4a88-af77-a6315c21006c",
          position: [183.14, 251.81, 260.444, 252.89],
          text: "Abteilung 2",
        },
        {
          id: "e21f1f36-f23c-45e7-9ae2-f441717f4ff2",
          position: [271.49, 251.81, 348.77, 252.89],
          text: "Abteilung 3",
        },
        {
          id: "91663566-cdd1-4383-9a57-9211d448fc7f",
          position: [359.81, 251.81, 437.114, 252.89],
          text: "Abteilung 4",
        },
        {
          id: "ae9235db-a3ca-437c-a4ab-54b16353c7c9",
          position: [448.15, 251.81, 526.39, 252.89],
          text: "Abteilung 5",
        },
        {
          id: "2d9f8245-533f-484f-b5e0-c3618d6c4c72",
          position: [537.43, 251.81, 614.734, 252.89],
          text: "Abteilung 6",
        },
        {
          id: "7a985d4b-7df5-4b54-afa6-86d6714f9e87",
          position: [94.824, 286.97, 172.104, 288.05],
          text: "Referat 11",
        },
        {
          id: "4029111d-e68f-4a0e-b3a1-a5c3dea7a81f",
          position: [183.14, 286.97, 260.444, 288.05],
          text: "Referat 21",
        },
        {
          id: "530a25ca-e2dc-41b9-b64e-18280fb16413",
          position: [271.49, 286.97, 348.77, 288.05],
          text: "Stabsstelle",
        },
        {
          id: "7e1d34c3-71ea-46bc-97b2-9fce010a8e2a",
          position: [359.81, 286.97, 437.114, 288.05],
          text: "Referat 41",
        },
        {
          id: "a665e315-8c11-4af9-a2c0-0d4709694730",
          position: [448.15, 286.97, 526.39, 288.05],
          text: "Referat 51",
        },
        {
          id: "9d2fdd23-c0ef-402b-8c24-d3e26e0c47c3",
          position: [537.43, 286.97, 614.734, 288.05],
          text: "Referat 61",
        },
        {
          id: "2d57ce5e-3a35-4909-8a9c-3d8cfb53c06f",
          position: [447.79, 412.27, 526.03, 412.63],
          text: "3570",
        },
        {
          id: "748de761-9ba1-497b-aed4-e40ea77fed04",
          position: [664.18, 176.9, 675.1, 177.26],
          text: "5200",
        },
        {
          id: "2676b50f-cb81-4039-9131-b82d29b45d9d",
          position: [697.54, 227.81, 774.844, 228.89],
          text: "MR Dr. Fritzsch 3480",
        },
        {
          id: "70f4086a-226d-4eef-9524-bab4dbb2d45a",
          position: [625.78, 251.81, 703.06, 252.89],
          text: "Abteilung 7",
        },
        {
          id: "9c7d189b-8388-49a1-9e88-a522d0c7f10f",
          position: [625.78, 286.97, 703.06, 288.05],
          text: "Referat 71",
        },
        {
          id: "a4b225d3-9fc4-41ed-b321-8835f9e8a7c6",
          position: [271.13, 454.66, 348.41, 455.02],
          text: "Referat 33",
        },
      ],
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
