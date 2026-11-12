/**
 * 文件头那一行(`src/plaza/mock.ts` + `-2 +3`)的样式调整。
 *
 * 库的默认布局是「文件名靠左、统计靠右」,这里改成统计紧跟路径,
 * 路径过长时省略(库自带 `direction: rtl` 的省略技巧,省略号在路径左边)。
 * 分割线用项目的 `--border` token;CSS 变量会继承进 Shadow DOM。
 */
export const headerCss = `
[data-diffs-header] {
	border-bottom: 1px solid var(--border);
}
[data-diffs-header=default] {
	justify-content: flex-start;
	/* 库默认 44px(1lh + 3×8px)，收到跟项目 PaneHeader 一样的 38px */
	min-height: 38px;
	padding-inline: 12px;
}
[data-diffs-header=default] [data-metadata] {
	flex: none;
}
/* 分割线和代码之间留一点空，别贴着 */
[data-diffs-header] ~ [data-diff] [data-code],
[data-diffs-header] ~ [data-file] [data-code] {
	padding-top: 6px;
}
/* 统计我们自己画（连字符减号字形比加号低），藏掉库自带的 */
[data-diffs-header=default] [data-additions-count],
[data-diffs-header=default] [data-deletions-count] {
	display: none;
}
/* 传了外部图标就把库自带的改动类型图标藏掉 */
:host(.diff-view-has-icon) [data-change-icon] {
	display: none;
}
`
