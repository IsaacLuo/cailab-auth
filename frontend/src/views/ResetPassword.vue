<template>
  <div class="login">
      <span slot="title" class="dialog-title">
        <img alt="logo" src="../assets/logo.png">
        <h1>reset passwrod</h1>
      </span>
      <span>
        <el-form ref="form" :model="form" label-width="80px">
          <el-form-item label="email">
            <el-input v-model="form.email"></el-input>
          </el-form-item>
        </el-form>
        <div>{{this.message}}</div>
      </span>
      <span slot="footer" class="dialog-footer" v-if="this.message === ''">
        <el-button type="primary" @click="onSubmit">submit</el-button>
        <router-link to="/" style="margin-left:10px;"><el-button>Cancel</el-button></router-link>
      </span>
      <span slot="footer" class="dialog-footer" v-else>
        <router-link to="/" style="margin-left:10px;"><el-button>Close</el-button></router-link>
      </span>
  </div>
</template>

<style scoped>
.alignRight 
{
  text-align: right;
}
.login
{
  padding: 25px;
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
export default class Login extends Vue {
  private form!: {
    email: string,
  };
  private message = '';

  public data() {
    return {
      form : {
        email: '',
      },
      message: '',
    };
  }

  public async onSubmit(event: MouseEvent) {
    try {
      const res = await axios.post(conf.serverURL + '/api/user/emailResetPassword', this.form, {withCredentials: true});
    } catch (err) {
      console.log('unable to send passwrod reset mail');
    }
    this.message = 'An email is sent to your address if you are an user, please check the inbox';
  }
}
</script>
