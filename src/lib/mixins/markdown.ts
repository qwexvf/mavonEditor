import { Component, Vue, Watch } from 'vue-property-decorator';
import { loadScript } from '../core/extra-function'

@Component
export default class MarkdownIt extends Vue {
  markdownIt = null
  needLangs: string[] = []
  missingLangs: string[] = []
  hljs_opts = {}

  setHljsOptions(options: any) {
    this.hljs_opts = options
  }

  mounted() {
    this.hljs_opts.highlighted = (this as any).ishljs;
  }

  $render(src: any, func: any) {
    const $vm = this;
    this.missingLangs = [];
    this.needLangs = [];

    const res = this.markdownIt.render(src);
    if ((this as any).ishljs) {
      if (this.needLangs.length > 0) {
        this.$_render(src, func, res);
      }
    }
    func(res);
  }

  $_render(src: any, func: any, res: any) {
    const $vm = (this as any)
    let deal = 0;
    for (var i = 0; i < this.needLangs.length; i++) {
      let url = $vm.p_external_link.hljs_lang(this.needLangs[i]);
      loadScript(url, function () {
        deal = deal + 1;
        if (deal === $vm.needLangs.length) {
          res = $vm.markdownIt.render(src);
          func(res);
        }
      })
    }
  }

  @Watch('ishljs')
  onIshljsChange(val: any) {
    (this as any).hljs_opts.highlighted = val;
  }
};
