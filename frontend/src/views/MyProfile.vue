<template>
  <div class="my-profile">
    <el-row :gutter="20" class="info-row">
      <el-col :span="4" class="item-title">
        id
      </el-col>
       <el-col :span="20" class="item-value">
        {{this.user._id}}
      </el-col>
    </el-row>

    <el-row :gutter="20" class="info-row">
      <el-col :span="4" class="item-title">
        email
      </el-col>
       <el-col :span="20" class="item-value">
        <el-input  v-model="user.email" />
      </el-col>
    </el-row>

    <el-row :gutter="20" class="info-row">
      <el-col :span="4" class="item-title">
        name
      </el-col>
       <el-col :span="20" class="item-value">
        <el-input  v-model="user.fullName" />
      </el-col>
    </el-row>

    <el-row :gutter="20" class="info-row">
      <el-col :span="4" class="item-title">
        groups
      </el-col>
       <el-col :span="20" class="item-value">
        <el-input v-model="groupString" @change="onChangeGroups"/>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="info-row">
      <el-col :span="4" class="item-title">
        portrait
      </el-col>
       <el-col :span="20" class="item-value">
        <img :src="`${serverURL}/api/user/current/portrait/l/profile.jpg`"/>
      </el-col>
    </el-row>
      <!-- <span slot="title" class="dialog-title">
        <img alt="logo" src="../assets/logo.png">
        <h1>login to cailab</h1>
      </span>
      <span>
        <el-form ref="form" :model="form" label-width="80px">
          <el-form-item label="email">
            <el-input v-model="form.email"></el-input>
          </el-form-item>
          <el-form-item label="password">
            <el-input type="password" v-model="form.password"></el-input>
          </el-form-item>
          <el-form-item class="alignRight">
            <router-link :to="this.$route.query.from ? `/signup?from=${this.$route.query.from}`: '/signup'">not a user? sign up here</router-link>
          </el-form-item>
        </el-form>
        <div>{{this.message}}</div>
      </span>
      <span slot="footer" class="dialog-footer">
        
        <el-button type="primary" @click="onSubmit">submit</el-button>
        <el-button @click="onCancel">Cancel</el-button>
      </span>  -->
  </div>
</template>

<style scoped>
.alignRight 
{
  text-align: right;
}
.my-profile
{
  padding: 25px;
}
.info-row
{
  margin: 25px;
}
.item-title
{
  min-height: 40px;
  display:flex;
  align-items: center;
}
.item-value
{
  min-height: 40px;
  display:flex;
  align-items: center;
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
  private user!: {
    _id: string,
    email: string,
    fullName: string,
    groups: string[],
  };
  private groupString!: string;
  private photo!: any;
  private message = '';
  private serverURL = conf.serverURL;

  public data() {
    return {
      user: {
        _id: '',
        email: '',
        fullName: '',
        groups: [],
      },
      groupString: '',
      message: '',
    };
  }

  public async created() {
    try {
      const res = await axios.get(conf.serverURL + '/api/user/current', {withCredentials: true});
      const user = res.data.user;
      this.user = user;
      this.groupString = user.groups.join(';')
      console.log(this.user);
      const res2 = await axios.get(conf.serverURL + '/api/user/current/portrait/l/portrait.jpg', {withCredentials: true});
      this.photo = res.data;
    } catch (err) {
      this.message = err.message;
      console.error(err.message);
    }
  }

  private onChangeGroups(val:any) {
    this.user.groups = val.split(';')
  }
  
}
</script>
