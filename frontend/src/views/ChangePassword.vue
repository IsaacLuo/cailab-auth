<template>
  <div class="my-profile">
    <div v-if="this.showRedirectButton">
      <router-link to="/">close</router-link>
    </div>
    <div v-else>
    <el-row :gutter="20" class="info-row">
      <el-col :span="4" class="item-title">
        password
      </el-col>
      <el-col :span="20" class="item-value">
        <el-input  v-model="password" type="password"/>
      </el-col>
    </el-row>
    <el-row :gutter="20" class="info-row">
      <el-col :span="4" class="item-title">
        password confirmation
      </el-col>
      <el-col :span="20" class="item-value">
        <el-input  v-model="passwordConfirmation" type="password" />
      </el-col>
    </el-row>
    <div style="text-align:right">
      <el-button type="primary" @click="onSaveProfile">save</el-button>
    </div>
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
export default class ChangePassword extends Vue {
  private groupString!: string;
  // private photo!: any;
  private message = '';
  private serverURL = conf.serverURL;
  private password!: string;
  private passwordConfirmation!: string;
  private showRedirectButton!: boolean;

  public data() {
    return {
      message: '',
      password: '',
      passwordConfirmation: '',
      showRedirectButton: false,
    };
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
      const payload:any = {};
      if (this.password !== '') {
        const {success, message} = this.verifyPasswordComplicity(this.password, this.passwordConfirmation);
        if (success) {
          payload.password = this.password;
          const res = await axios.put(conf.serverURL + `/api/user/password/${this.$route.params.token}`, payload, {withCredentials: true});
          Notification.success('password set');
          this.showRedirectButton = true;
        } else {
          Notification.error(message);
          return;
        }
      }
    } catch (err) {
      Notification.error('unable to reset password');
    }
  }
  
}
</script>
