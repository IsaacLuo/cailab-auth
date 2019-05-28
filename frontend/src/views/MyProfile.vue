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
        <div >{{user.email}}</div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="info-row">
      <el-col :span="4" class="item-title">
        name
      </el-col>
      <el-col :span="20" class="item-value">
        <el-input  v-model="user.name" />
      </el-col>
    </el-row>

    <el-row :gutter="20" class="info-row">
      <el-col :span="4" class="item-title">
        password
      </el-col>
      <el-col :span="20" class="item-value">
        <el-input  v-model="password" />
      </el-col>
    </el-row>
    <el-row :gutter="20" class="info-row">
      <el-col :span="4" class="item-title">
        password confirmation
      </el-col>
      <el-col :span="20" class="item-value">
        <el-input  v-model="passwordConfirmation" />
      </el-col>
    </el-row>

    <el-row :gutter="20" class="info-row">
      <el-col :span="4" class="item-title">
        groups
      </el-col>
      <el-col :span="20" class="item-value">
        <el-input v-model="groupString" @change="onChangeGroups" v-if="user.groups.indexOf('administrators')>=0"/>
        <div v-else>{{groupString === '' ? 'guests' : groupString}}</div>
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
    <div style="text-align:right">
      <el-button type="primary" @click="onSaveProfile">save</el-button>
    </div>
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
import { Notification } from 'element-ui';

@Component({
  components: {
  },
})
export default class MyProfile extends Vue {
  private user!: {
    _id: string,
    email: string,
    name: string,
    groups: string[],
  };
  private groupString!: string;
  private photo!: any;
  private message = '';
  private serverURL = conf.serverURL;
  private password!: string;
  private passwordConfirmation!: string;

  public data() {
    return {
      user: {
        _id: '',
        email: '',
        name: '',
        groups: [],
      },
      groupString: '',
      message: '',
      password: '',
      passwordConfirmation: '',
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

  private verifyPasswordComplicity(password:string, passwordConfirmation:string) {
    if (passwordConfirmation !== password) {
      return {success:false, message: 'passwords don\'t match'};
    }  
    if (
      !(
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password)
      )
    ) {
      return {success:false, message:'password should match complicity requirement'};
    }
    return {success:true, message:''};
}

  private async onSaveProfile(val:any) {
    try {
      const payload:any = {name: this.user.name};
      if (/^[A-Za-z0-9\.-]+ [A-Za-z0-9\.-]+$/.test(payload.name)) {
        payload.name = this.user.name;
      } else {
        Notification.error('name is invalid');
        return;
      }
      if (this.password !== '') {
        const {success, message} = this.verifyPasswordComplicity(this.password, this.passwordConfirmation);
        if (success) {
          payload.password = this.password;
        } else {
          Notification.error(message);
          return;
        }
      }
      const res = await axios.put(conf.serverURL + `/api/user/${this.user._id}`, payload, {withCredentials: true});
      Notification.success('profile updated');
      console.log('changed keys', res.data.changedKeys);
    } catch (err) {
      Notification.error('unable to update profile');
    }
  }
  
}
</script>
