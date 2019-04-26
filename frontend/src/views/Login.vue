<template>
  <div class="login">
      <span slot="title" class="dialog-title">
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
    password: string,
  };
  private message = '';

  public data() {
    return {
      form : {
        email: '',
        password: '',
      },
      message: '',
    };
  }

  public onCancel(event: MouseEvent) {
    const from = this.$route.query.from as string;
    window.location.href = from;
  }

  public async onSubmit(event: MouseEvent) {
    try {
      const res = await axios.post(conf.serverURL + '/api/session', this.form, {withCredentials: true});
      const user = res.data;
      (window as any).user = user;
      if (user.groups.indexOf('emailNotVerified')>=0) {
        try {
          const res = await axios.post(
            conf.serverURL + '/api/user/emailVerification',
            this.form,
            { withCredentials: true },
          );
          this.message = 'You have not verify the email address. An email is sent to your email box';
        } catch (error) {
          this.message = error.message;
        }
      }
      else {
        if (window.opener) {
          window.opener.postMessage({event: 'closed', success: true}, '*');
        }
        window.close();
      }
    } catch (err) {
      this.message = err.message;
      console.error(err.message);
    }
  }
}
</script>
