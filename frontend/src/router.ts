import Vue from 'vue';
import Router from 'vue-router';
import Login from '@/views/Login.vue';
import Signup from '@/views/Signup.vue';
import EmailVerification from '@/views/EmailVerification.vue';
import MyProfile from '@/views/MyProfile.vue';
import UserList from '@/views/UserList.vue';
import GuestLogin from '@/views/GuestLogin.vue';
import ResetPassword from '@/views/ResetPassword.vue';
import ChangePassword from '@/views/ChangePassword.vue';
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
      path: '/user/:id',
      name: 'userProfile',
      component: MyProfile,
    },
    {
      path: '/login',
      name: 'Login',
      component: Login,
    },
    {
      path: '/signup',
      name: 'Signup',
      component: Signup,
    },
    {
      path: '/users',
      name: 'UserList',
      component: UserList,
    },
    {
      path: '/emailVerification/:token',
      name: 'EmailVerification',
      component: EmailVerification,
    },
    {
      path: '/resetPassword',
      name: 'ResetPassword',
      component: ResetPassword,
    },
    {
      path: '/changePassword/:token',
      name: 'ChangePassword',
      component: ChangePassword,
    },
    {
      path: '/guestLogin',
      name: 'GuestLogin',
      component: GuestLogin,
    }
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
