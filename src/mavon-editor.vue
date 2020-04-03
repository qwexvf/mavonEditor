<template>
  <div
    :class="[{ 'fullscreen': s_fullScreen, 'shadow': boxShadow }]"
    class="v-note-wrapper markdown-body"
    :style="{'box-shadow': boxShadow ? boxShadowStyle : ''}"
  >
    <!--工具栏-->
    <div class="v-note-op" v-show="toolbarsFlag" :style="{'background': toolbarsBackground}">
      <v-md-toolbar-left
        ref="toolbar_left"
        :editable="editable"
        :transition="transition"
        :d_words="d_words"
        @toolbar_left_click="toolbar_left_click"
        @toolbar_left_addlink="toolbar_left_addlink"
        :toolbars="toolbars"
        @imgAdd="$imgAdd"
        @imgDel="$imgDel"
        @imgTouch="$imgTouch"
        :image_filter="imageFilter"
        :class="{'transition': transition}"
      >
        <slot name="left-toolbar-before" slot="left-toolbar-before" />
        <slot name="left-toolbar-after" slot="left-toolbar-after" />
      </v-md-toolbar-left>
      <v-md-toolbar-right
        ref="toolbar_right"
        :d_words="d_words"
        @toolbar_right_click="toolbar_right_click"
        :toolbars="toolbars"
        :s_subfield="s_subfield"
        :s_preview_switch="s_preview_switch"
        :s_fullScreen="s_fullScreen"
        :s_html_code="s_html_code"
        :s_navigation="s_navigation"
        :class="{'transition': transition}"
      >
        <slot name="right-toolbar-before" slot="right-toolbar-before" />
        <slot name="right-toolbar-after" slot="right-toolbar-after" />
      </v-md-toolbar-right>
    </div>
    <!--编辑展示区域-->
    <div class="v-note-panel">
      <!--编辑区-->
      <div
        ref="vNoteEdit"
        @scroll="$v_edit_scroll"
        class="v-note-edit divarea-wrapper"
        :class="{'scroll-style': s_scrollStyle, 'scroll-style-border-radius': s_scrollStyle && !s_preview_switch && !s_html_code, 'single-edit': !s_preview_switch && !s_html_code, 'single-show': (!s_subfield && s_preview_switch) || (!s_subfield && s_html_code), 'transition': transition}"
        @click="textAreaFocus"
      >
        <div class="content-input-wrapper" :style="{'background-color': editorBackground}">
          <!-- 双栏 -->
          <v-autoTextarea
            ref="vNoteTextarea"
            :placeholder="placeholder ? placeholder : d_words.start_editor"
            class="content-input"
            :fontSize="fontSize"
            lineHeight="1.5"
            v-model="d_value"
            fullHeight
            :style="{'background-color': editorBackground}"
          ></v-autoTextarea>
        </div>
      </div>
      <!--展示区-->
      <div
        :class="{'single-show': (!s_subfield && s_preview_switch) || (!s_subfield && s_html_code)}"
        v-show="s_preview_switch || s_html_code"
        class="v-note-show"
      >
        <div
          ref="vShowContent"
          v-html="d_render"
          v-show="!s_html_code"
          :class="{'scroll-style': s_scrollStyle, 'scroll-style-border-radius': s_scrollStyle}"
          class="v-show-content"
          :style="{'background-color': previewBackground}"
        ></div>
        <div
          v-show="s_html_code"
          :class="{'scroll-style': s_scrollStyle, 'scroll-style-border-radius': s_scrollStyle}"
          class="v-show-content-html"
          :style="{'background-color': previewBackground}"
        >{{d_render}}</div>
      </div>

      <!--标题导航-->
      <transition name="slideTop">
        <div
          v-show="s_navigation"
          class="v-note-navigation-wrapper"
          :class="{'transition': transition}"
        >
          <div class="v-note-navigation-title">
            {{d_words.navigation_title}}
            <i
              @click="toolbar_right_click('navigation')"
              class="fa fa-mavon-times v-note-navigation-close"
              aria-hidden="true"
            ></i>
          </div>
          <div
            ref="navigationContent"
            class="v-note-navigation-content"
            :class="{'scroll-style': s_scrollStyle}"
          ></div>
        </div>
      </transition>
    </div>
    <!--帮助文档-->
    <transition name="fade">
      <div ref="help">
        <div @click="toolbar_right_click('help')" class="v-note-help-wrapper" v-if="s_help">
          <div class="v-note-help-content markdown-body" :class="{'shadow': boxShadow}">
            <i
              @click.stop.prevent="toolbar_right_click('help')"
              class="fa fa-mavon-times"
              aria-hidden="true"
            ></i>
            <div class="scroll-style v-note-help-show" v-html="d_help"></div>
          </div>
        </div>
      </div>
    </transition>
    <!-- 预览图片 -->
    <transition name="fade">
      <div @click="d_preview_imgsrc=null" class="v-note-img-wrapper" v-if="d_preview_imgsrc">
        <img :src="d_preview_imgsrc" alt="none" />
      </div>
    </transition>
    <!--阅读模式-->
    <div :class="{'show': s_readmodel}" class="v-note-read-model scroll-style" ref="vReadModel">
      <div ref="vNoteReadContent" class="v-note-read-content" v-html="d_render"></div>
    </div>
  </div>
</template>

<script lang="ts">
/* eslint-disable camelcase */
import { autoTextarea } from "auto-textarea";
import { Component, Vue, Watch, Prop } from "vue-property-decorator";

import { keydownListen } from "./lib/core/keydown-listen";
import hljsCss from "./lib/core/hljs/lang.hljs.css.js";
import hljsLangs from "./lib/core/hljs/lang.hljs.js";
import {
  fullscreenchange,
  scrollLink,
  insertTextAtCaret,
  getNavigation,
  insertTab,
  unInsertTab,
  insertOl,
  insertUl,
  insertEnter,
  removeLine,
  loadLink,
  loadScript,
  ImagePreviewListener
} from "./lib/core/extra-function";
import { p_ObjectCopy_DEEP, stopEvent } from "./lib/util";
import {
  toolbar_left_click,
  toolbar_left_addlink
} from "./lib/toolbar_left_click";
import { toolbar_right_click } from "./lib/toolbar_right_click";
import defaultConfig from "./lib/config";
import hljs from "./lib/core/highlight";
import markdown from "./lib/mixins/markdown";

import md_toolbar_left from "./components/md-toolbar-left.vue";
import md_toolbar_right from "./components/md-toolbar-right.vue";

import "./lib/font/css/fontello.css";
import "./lib/css/md.css";

interface TextOptions {
  prefix: string;
  subfix: string;
  str: string;
  type: string;
}

@Component({
  components: {
    "v-autoTextarea": autoTextarea,
    "v-md-toolbar-left": md_toolbar_left,
    "v-md-toolbar-right": md_toolbar_right
  },
  mixins: [markdown]
})
export default class MarkdownEditor extends Vue implements markdown {
  markdownIt: null;
  needLangs: string[];
  missingLangs: string[];
  hljs_opts: {};
  setHljsOptions(options: any): void {
    throw new Error("Method not implemented.");
  }
  $render(src: any, func: any): void {
    throw new Error("Method not implemented.");
  }
  $_render(src: any, func: any, res: any): void {
    throw new Error("Method not implemented.");
  }
  onIshljsChange(val: any): void {
    throw new Error("Method not implemented.");
  }
  @Prop({ type: Boolean, default: true })
  scrollStyle: boolean = true;

  @Prop({ type: Boolean, default: true })
  boxShadow: boolean = true;

  @Prop({ type: Boolean, default: true })
  transition: boolean = true;

  @Prop({ type: Boolean, default: true })
  autofocus: boolean = true;

  @Prop({ type: String, default: "15px" })
  fontSize: string = "15px";

  @Prop({ type: String, default: "#ffffff" })
  toolbarsBackground: string = "#ffffff";

  @Prop({ type: String, default: "#ffffff" })
  editorBackground: string = "#ffffff";

  @Prop({ type: String, default: "#fbfbfb" })
  previewBackground: string = "#fbfbfb";

  @Prop({ type: String, default: "0 2px 12px 0 rgba(0, 0, 0, 0.1)" })
  boxShadowStyle: string = "0 2px 12px 0 rgba(0, 0, 0, 0.1)";

  @Prop({ type: String, default: "" })
  help: string = "";

  @Prop({ type: String, default: "" })
  value: string = "";

  @Prop({ type: String, default: "zh-CN" })
  language: string = "ja-JP";

  @Prop({ type: Boolean, default: true })
  subfield: boolean = false;

  @Prop({ type: Boolean, default: false })
  navigation: boolean = false;

  @Prop({ type: String, default: "" })
  defaultOpen: string = "";

  @Prop({ type: Boolean, default: true })
  editable: boolean = true;

  @Prop({ type: Boolean, default: true })
  toolbarsFlag: boolean = true;

  @Prop({ type: Object, default: () => defaultConfig.toolbars })
  toolbars: Object = defaultConfig.toolbars;

  @Prop({ type: String, default: "github" })
  codeStyle: string = "github";

  @Prop({ type: String, default: "" })
  placeholder: string = "";

  @Prop({ type: Boolean, default: true })
  ishljs: boolean = true;

  @Prop({ type: [Object, Boolean], default: true })
  externalLink: boolean = true;

  @Prop({ type: Function, default: null })
  imageFilter: CallableFunction | null = null;

  @Prop({ type: Function, default: null })
  imageClick: CallableFunction | null = null;

  @Prop({ type: Number, default: 0 })
  tabSize: number = 0;

  @Prop({ type: Boolean, default: true })
  shortCut: boolean = true;

  s_right_click_menu_show = false;
  right_click_menu_top = 0;
  right_click_menu_left = 0;

  s_subfield = (() => {
    return this.subfield;
  })();

  s_autofocus = true;

  s_navigation = (() => {
    return this.navigation;
  })();

  s_scrollStyle = (() => {
    return this.scrollStyle;
  })();

  d_value = ""; // props 文本内容
  d_render = ""; // props 文本内容render

  s_preview_switch = (() => {
    let default_open_ = this.defaultOpen;
    if (!default_open_) {
      default_open_ = this.subfield ? "preview" : "edit";
    }
    return default_open_ === "preview" ? true : false;
  })(); // props true 展示编辑 false展示预览

  s_fullScreen = false; // 全屏编辑标志
  s_help = false; // markdown帮助
  s_html_code = false; // 分栏情况下查看html
  d_help = null;
  d_words = null;
  edit_scroll_height = -1;
  s_readmodel = false;
  s_table_enter = false; // 回车事件是否在表格中执行

  d_history = (() => {
    let temp_array = [];
    temp_array.push(this.value);
    return temp_array;
  })(); // 编辑记录

  d_history_index = 0; // 编辑记录索引
  currentTimeout: CallableFunction | null = null;
  d_image_file = [];
  d_preview_imgsrc = null; // 图片预览地址
  s_external_link = {
    markdown_css: function() {
      return "https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/2.9.0/github-markdown.min.css";
    },
    hljs_js: function() {
      return "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/highlight.min.js";
    },
    hljs_lang: function(lang: string) {
      return (
        "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/languages/" +
        lang +
        ".min.js"
      );
    },
    hljs_css: function(css: string) {
      if (hljsCss[css]) {
        return (
          "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/styles/" +
          css +
          ".min.css"
        );
      }
      return "";
    },
    katex_js: function() {
      return "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.8.3/katex.min.js";
    },
    katex_css: function() {
      return "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.8.3/katex.min.css";
    }
  };
  p_external_link = {};
  textarea_selectionEnd = 0;
  textarea_selectionEnds = [0];

  created() {
    const $vm = this;
    // 初始化语言
    this.initLanguage();
    this.initExternalFuc();
    this.$nextTick(() => {
      // 初始化Textarea编辑开关
      $vm.editableTextarea();
    });
  }

  mounted() {
    const $vm = this;
    this.$el.addEventListener("paste", function(e) {
      $vm.$paste(e);
    });
    this.$el.addEventListener("drop", function(e) {
      $vm.$drag(e);
    });
    // 浏览器siz大小
    /* windowResize(this); */
    keydownListen(this);
    // 图片预览事件监听
    ImagePreviewListener(this);
    // 设置默认焦点
    if (this.autofocus) {
      this.getTextareaDom().focus();
    }
    // fullscreen事件
    fullscreenchange(this);
    this.d_value = this.value;
    // 将help添加到末尾
    document.body.appendChild(this.$refs.help);
    this.loadExternalLink("markdown_css", "css");
    this.loadExternalLink("katex_css", "css");
    this.loadExternalLink("katex_js", "js", function() {
      $vm.iRender(true);
    });
    this.loadExternalLink("hljs_js", "js", function() {
      $vm.iRender(true);
    });

    if (
      !(
        typeof $vm.externalLink === "object" &&
        typeof $vm.externalLink["markdown_css"] === "function"
      )
    ) {
      // 没有外部文件要来接管markdown样式，可以更改markdown样式。
      $vm.codeStyleChange($vm.codeStyle, true);
    }
  }

  beforeDestroy() {
    document.body.removeChild(this.$refs.help);
  }

  getMarkdownIt() {
    return this;
  }

  loadExternalLink(
    name: string,
    type: string,
    callback: CallableFunction | null = null
  ) {
    if (typeof this.p_external_link[name] !== "function") {
      if (this.p_external_link[name] != false) {
        console.error(
          "external_link." + name,
          "is not a function, if you want to disabled this error log, set external_link." +
            name,
          "to function or false"
        );
      }
      return;
    }
    const _obj = {
      css: loadLink,
      js: loadScript
    };
    if (_obj.hasOwnProperty(type)) {
      _obj[type](this.p_external_link[name](), callback);
    }
  }

  initExternalFuc() {
    const $vm = this;
    const _external_ = [
      "markdown_css",
      "hljs_js",
      "hljs_css",
      "hljs_lang",
      "katex_js",
      "katex_css"
    ];
    const _type_ = typeof $vm.externalLink;
    const _is_object = _type_ === "object";
    const _is_boolean = _type_ === "boolean";
    for (let i = 0; i < _external_.length; i++) {
      if (
        (_is_boolean && !$vm.externalLink) ||
        (_is_object && $vm.externalLink[_external_[i]] === false)
      ) {
        $vm.p_external_link[_external_[i]] = false;
      } else if (
        _is_object &&
        typeof $vm.externalLink[_external_[i]] === "function"
      ) {
        $vm.p_external_link[_external_[i]] = $vm.externalLink[_external_[i]];
      } else {
        $vm.p_external_link[_external_[i]] = $vm.s_external_link[_external_[i]];
      }
    }
  }

  textAreaFocus() {
    this.$refs.vNoteTextarea.$refs.vTextarea.focus();
  }

  $drag($e) {
    let dataTransfer = $e.dataTransfer;
    if (dataTransfer) {
      let files = dataTransfer.files;
      if (files.length > 0) {
        $e.preventDefault();
        this.$refs.toolbar_left.$imgFilesAdd(files);
      }
    }
  }

  $paste($e) {
    let clipboardData = $e.clipboardData;
    if (clipboardData) {
      let items = clipboardData.items;
      if (!items) return;
      let types = clipboardData.types || [];
      let item = null;
      for (let i = 0; i < types.length; i++) {
        if (types[i] === "Files") {
          item = items[i];
          break;
        }
      }
      if (item && item.kind === "file") {
        // prevent filename being pasted parallel along
        // with the image pasting process
        stopEvent($e);
        let oFile = item.getAsFile();
        this.$refs.toolbar_left.$imgFilesAdd([oFile]);
      }
    }
  }

  $imgTouch(file) {
    const $vm = this;
    // TODO 跳转到图片位置
  }

  $imgDel(file) {
    this.markdownIt.image_del(file[1]);
    // 删除所有markdown中的图片
    let fileReg = file[0];
    let reg = new RegExp(`\\!\\[${file[1]._name}\\]\\(${fileReg}\\)`, "g");

    this.d_value = this.d_value.replace(reg, "");
    this.iRender();
    this.$emit("imgDel", file);
  }

  $imgAdd(pos, $file, isinsert) {
    const $vm = this;
    if (isinsert === undefined) isinsert = true;
    if (this.__rFilter == null) {
      // this.__rFilter = /^(?:image\/bmp|image\/cis\-cod|image\/gif|image\/ief|image\/jpeg|image\/jpeg|image\/jpeg|image\/pipeg|image\/png|image\/svg\+xml|image\/tiff|image\/x\-cmu\-raster|image\/x\-cmx|image\/x\-icon|image\/x\-portable\-anymap|image\/x\-portable\-bitmap|image\/x\-portable\-graymap|image\/x\-portable\-pixmap|image\/x\-rgb|image\/x\-xbitmap|image\/x\-xpixmap|image\/x\-xwindowdump)$/i;
      this.__rFilter = /^image\//i;
    }
    this.__oFReader = new FileReader();
    this.__oFReader.onload = function(oFREvent) {
      $vm.markdownIt.image_add(pos, oFREvent.target.result);
      $file.miniurl = oFREvent.target.result;
      if (isinsert === true) {
        // 去除特殊字符
        $file._name = $file.name.replace("/[[]()+{}&|\\*^%$#@-]/g", "");

        $vm.insertText($vm.getTextareaDom(), {
          prefix: "![" + $file._name + "](" + pos + ")",
          subfix: "",
          str: "",
          type: ""
        });
        $vm.$nextTick(function() {
          $vm.$emit("imgAdd", pos, $file);
        });
      }
    };
    if ($file) {
      const oFile = $file;
      if (this.__rFilter.test(oFile.type)) {
        this.__oFReader.readAsDataURL(oFile);
      }
    }
  }

  $imgUpdateByUrl(pos, url) {
    const $vm = this;
    this.markdownIt.image_add(pos, url);
    this.$nextTick(function() {
      $vm.d_render = this.markdownIt.render(this.d_value);
    });
  }

  $imgAddByUrl(pos, url) {
    if (this.$refs.toolbar_left.$imgAddByUrl(pos, url)) {
      this.$imgUpdateByUrl(pos, url);
      return true;
    }
    return false;
  }

  $img2Url(fileIndex, url) {
    // x.replace(/(\[[^\[]*?\](?=\())\(\s*(\.\/2)\s*\)/g, "$1(http://path/to/png.png)")
    const reg_str =
      "/(!\\[[^\\[]*?\\](?=\\())\\(\\s*(" + fileIndex + ")\\s*\\)/g";
    const reg = eval(reg_str);
    this.d_value = this.d_value.replace(reg, "$1(" + url + ")");
    this.$refs.toolbar_left.$changeUrl(fileIndex, url);
    this.iRender();
  }

  $imglst2Url(imglst) {
    if (imglst instanceof Array) {
      for (let i = 0; i < imglst.length; i++) {
        this.$img2Url(imglst[i][0], imglst[i][1]);
      }
    }
  }

  toolbar_left_click(_type) {
    toolbar_left_click(_type, this);
  }

  toolbar_left_addlink(_type, text, link) {
    toolbar_left_addlink(_type, text, link, this);
  }

  toolbar_right_click(_type) {
    toolbar_right_click(_type, this);
  }

  getNavigation($vm, full) {
    return getNavigation($vm, full);
  }

  // @event
  // 修改数据触发 （val ， val_render）
  change(val, render) {
    this.$emit("change", val, render);
  }

  // 切换全屏触发 （status , val）
  fullscreen(status, val) {
    this.$emit("fullScreen", status, val);
  }

  // 打开阅读模式触发（status , val）
  readmodel(status, val) {
    this.$emit("readModel", status, val);
  }

  // 切换阅读编辑触发 （status , val）
  previewtoggle(status, val) {
    this.$emit("previewToggle", status, val);
  }

  // 切换分栏触发 （status , val）
  subfieldtoggle(status, val) {
    this.$emit("subfieldToggle", status, val);
  }

  // 切换htmlcode触发 （status , val）
  htmlcode(status, val) {
    this.$emit("htmlCode", status, val);
  }

  // 打开 , 关闭 help触发 （status , val）
  helptoggle(status, val) {
    this.$emit("helpToggle", status, val);
  }

  // 监听ctrl + s
  save(val, render) {
    this.$emit("save", val, render);
  }

  // 导航栏切换
  navigationtoggle(status, val) {
    this.$emit("navigationToggle", status, val);
  }

  $toolbar_right_read_change_status() {
    this.s_readmodel = !this.s_readmodel;
    if (this.readmodel) {
      this.readmodel(this.s_readmodel, this.d_value);
    }
    if (this.s_readmodel && this.toolbars.navigation) {
      this.getNavigation(this, true);
    }
  }

  // ---------------------------------------
  // 滚动条联动
  $v_edit_scroll($event) {
    scrollLink($event, this);
  }

  // 获取textarea dom节点
  getTextareaDom() {
    return this.$refs.vNoteTextarea.$refs.vTextarea;
  }

  // 工具栏插入内容
  insertText(obj, textOptions: TextOptions) {
    // if (this.s_preview_switch) {

    insertTextAtCaret(obj, { textOptions }, this);
  }

  insertTab() {
    insertTab(this, this.tabSize);
  }

  insertOl() {
    insertOl(this);
  }

  removeLine() {
    removeLine(this);
  }

  insertUl() {
    insertUl(this);
  }

  unInsertTab() {
    unInsertTab(this, this.tabSize);
  }

  insertEnter(event) {
    insertEnter(this, event);
  }

  saveHistory() {
    this.d_history.splice(this.d_history_index + 1, this.d_history.length);
    this.d_history.push(this.d_value);
    this.textarea_selectionEnds.splice(
      this.d_history_index + 1,
      this.textarea_selectionEnds.length
    );
    this.textarea_selectionEnds.push(this.textarea_selectionEnd);
    this.d_history_index = this.d_history.length - 1;
  }

  saveSelectionEndsHistory() {
    const textarea =
      this.$refs.vNoteTextarea &&
      this.$refs.vNoteTextarea.$el.querySelector("textarea");
    this.textarea_selectionEnd = textarea
      ? textarea.selectionEnd
      : this.textarea_selectionEnd;
  }

  initLanguage() {
    const $vm = this;
    let lang =
      defaultConfig.langList.indexOf(this.language) >= 0
        ? this.language
        : "zh-CN";
    $vm.$render(defaultConfig[`help_${lang}`], function(res) {
      $vm.d_help = res;
    });
    this.d_words = defaultConfig[`words_${lang}`];
  }

  // 编辑开关
  editableTextarea() {
    let text_dom = this.$refs.vNoteTextarea.$refs.vTextarea;
    if (this.editable) {
      text_dom.removeAttribute("disabled");
    } else {
      text_dom.setAttribute("disabled", "disabled");
    }
  }

  codeStyleChange(val: string, isInit = false) {
    if (typeof this.p_external_link.hljs_css !== "function") {
      if (this.p_external_link.hljs_css != false) {
        console.error(
          "external_link.hljs_css is not a function, if you want to disabled this error log, set external_link.hljs_css to function or false"
        );
      }
      return;
    }
    let url = this.p_external_link.hljs_css(val);
    if (url.length === 0 && isInit) {
      console.warn(
        "hljs color scheme",
        val,
        "do not exist, loading default github"
      );
      url = this.p_external_link.hljs_css("github");
    }
    if (url.length > 0) {
      loadLink(url);
    } else {
      console.warn(
        "hljs color scheme",
        val,
        "do not exist, hljs color scheme will not change"
      );
    }
  }

  iRender(toggleChange = false) {
    const $vm = this;
    this.$render($vm.d_value, function(res: string) {
      // render
      $vm.d_render = res;
      // change回调  toggleChange == false 时候触发change回调
      if (!toggleChange) {
        if ($vm.change) $vm.change($vm.d_value, $vm.d_render);
      }
      // 改变标题导航
      if ($vm.s_navigation) getNavigation($vm, false);
      // v-model 语法糖
      $vm.$emit("input", $vm.d_value);
      // 塞入编辑记录数组
      if ($vm.d_value === $vm.d_history[$vm.d_history_index]) return;
      window.clearTimeout($vm.currentTimeout);
      $vm.currentTimeout = setTimeout(() => {
        $vm.saveHistory();
      }, 500);
    });
  }

  // 清空上一步 下一步缓存
  $emptyHistory() {
    this.d_history = [this.d_value]; // 编辑记录
    this.d_history_index = 0; // 编辑记录索引
  }

  @Watch("d_value")
  on_d_valueChange(val, oldVal) {
    this.saveSelectionEndsHistory();
    this.iRender();
  }

  @Watch("value")
  onValue(val: string) {
    if (val !== this.d_value) {
      this.d_value = val;
    }
  }

  @Watch("subfield")
  ReonSubfield(val: any) {
    this.s_subfield = val;
  }

  @Watch("d_history_index")
  on_d_historyIndexChange() {
    if (this.d_history_index > 20) {
      this.d_history.shift();
      this.d_history_index = this.d_history_index - 1;
    }
    this.d_value = this.d_history[this.d_history_index];
  }

  @Watch("language")
  onLanguage() {
    this.initLanguage();
  }

  @Watch("editable")
  onEditableChange() {
    this.editableTextarea();
  }

  @Watch("defaultOpen")
  onDefaultOpenChange(val: any) {
    let default_open_ = val;
    if (!default_open_) {
      default_open_ = this.subfield ? "preview" : "edit";
    }
    return (this.s_preview_switch = default_open_ === "preview" ? true : false);
  }

  @Watch("codeStyle")
  onCodeStyleChange(val: string) {
    this.codeStyleChange(val);
  }
}
</script>

<style lang="stylus" rel="stylesheet/stylus">
@import 'lib/css/scroll.styl';
@import 'lib/css/mavon-editor.styl';
</style>

<style lang="css" scoped>
.auto-textarea-wrapper {
  height: 100%;
}
</style>
