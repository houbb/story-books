/**
 * Server-side render the Vue page components to HTML strings so the page-flip
 * engine can loadFromHTML() without coupling to Vue's runtime mount lifecycle.
 *
 * Pages are tiny and static after story data is known, so this is the
 * cleanest contract between BookEngine and the flip library.
 */

import { createSSRApp, h, type Component } from 'vue';
import { renderToString } from 'vue/server-renderer';

export async function renderPageHtml(component: Component, props: Record<string, unknown>): Promise<string> {
  const app = createSSRApp({ render: () => h(component, props as never) });
  return renderToString(app);
}
