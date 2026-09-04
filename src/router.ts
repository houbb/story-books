/**
 * Router — three surfaces:
 *   /                  Home (book cover entry)
 *   /read              Book reader (cover, contents, stories, ending)
 *   /map               Standalone Story Map (full screen)
 */

import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

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
