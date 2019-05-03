import Vue from 'vue';
import Router from 'vue-router';
import Login from '@/views/Login.vue';
import Signup from '@/views/Signup.vue';
import EmailVerification from '@/views/EmailVerification.vue';
import MyProfile from '@/views/MyProfile.vue';

Vue.use(Router);

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'home',
      component: Login,
    },
    {
      path: '/myProfile',
      name: 'myProfile',
      component: MyProfile,
    },
    {
      path: '/login',
      name: 'home',
      component: Login,
    },
    {
      path: '/signup',
      name: 'home',
      component: Signup,
    },
        {
      path: '/emailVerification/:token',
      name: 'home',
      component: EmailVerification,
    },
    // {
    //   path: '/about',
    //   name: 'about',
    //   // route level code-splitting
    //   // this generates a separate chunk (about.[hash].js) for this route
    //   // which is lazy-loaded when the route is visited.
    //   component: () => import(/* webpackChunkName: "about" */ './views/About.vue'),
    // },
  ],
});
