import mavonEditor from "./mavon-editor.vue";

export const VueMavonEditor = {
  mavonEditor: mavonEditor,
  LeftToolbar: import("./components/md-toolbar-left.vue"),
  RightToolbar: import("./components/md-toolbar-right.vue"),
};