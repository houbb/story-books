import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

/**
 * Router — surfaces:
 *   /          Home (book cover entry)
 *   /read      Book reader (cover, contents, stories, ending)
 *   /map       Standalone Story Map
 *   /stats     Word-count dashboard (per story + aggregate)
 *   /search    Full-text search results (?q=…)
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/Home.vue'),
  },
  {
    path: '/read',
    name: 'read',
    component: () => import('@/views/Reader.vue'),
  },
  {
    path: '/map',
    name: 'map',
    component: () => import('@/views/StoryMapView.vue'),
  },
  {
    path: '/stats',
    name: 'stats',
    component: () => import('@/views/StatsView.vue'),
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});
