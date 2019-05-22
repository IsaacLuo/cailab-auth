<template>
  <table>
    <thead>
      <th>#</th>
      <th>id</th>
      <th>name</th>
      <th>email</th>
      <th>groups</th>
    </thead>
    <tbody>
    <tr v-for="user in users" :key="user._id">
      <td><img :src="`${conf.serverURL}/api/user/${user._id}/portrait/s/profile.jpg`" /></td>
      <td>{{user._id}}</td>
      <td>{{user.name}}</td>
      <td>{{user.email}}</td>
      <td>{{user.groups}}</td>
    </tr>
    </tbody>
  </table>
</template>

<style scoped>
td {
  padding:15px;
}
</style>


<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import axios from 'axios';
import conf from '@/../conf';

@Component({
  components: {
  },
})
export default class MyProfile extends Vue {
  private users!: [{
    _id: string,
    email: string,
    fullName: string,
    groups: string[],
  }];
  private message!: string;
  private conf: any;

  public data() {
    return {
      users: [],
      message: '',
      conf,
    };
  }

  public async created() {
    try {
      const res = await axios.get(conf.serverURL + '/api/users', {withCredentials: true});
      this.users = res.data.users;
      
      // const res2 = await axios.get(conf.serverURL + '/api/user/current/portrait/l/portrait.jpg', {withCredentials: true});
      // this.photo = res.data;
    } catch (err) {
      this.message = err.message;
      console.error(err.message);
    }
  }  
}
</script>
