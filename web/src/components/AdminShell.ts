import { defineComponent } from "vue";
import { RouterLink } from "vue-router";

export default defineComponent({
  name: "AdminShell",
  components: { RouterLink },
  template: `
    <div id="primary" class="content-area sakura-admin">
      <div id="main" class="site-main">
        <h1 class="main-title flex-child-center" style="font-family: 'Ubuntu', sans-serif">
          <span class="iconify" data-icon="solar:widget-add-linear"></span>
          <span>内容工作台</span>
        </h1>
        <ul class="admin-tabs">
          <li><RouterLink data-pjax to="/admin">总览</RouterLink></li>
          <li><RouterLink data-pjax to="/admin/posts/new">文章编辑</RouterLink></li>
          <li><RouterLink data-pjax to="/admin/taxonomy">分类标签</RouterLink></li>
          <li><RouterLink data-pjax to="/admin/settings">站点设置</RouterLink></li>
        </ul>
        <slot />
      </div>
    </div>
  `,
});
