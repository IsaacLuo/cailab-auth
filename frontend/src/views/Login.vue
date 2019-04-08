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
            <router-link :to="`/signup?from=${this.$route.query.from}`">not a user? sign up here</router-link>
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
      (window as any).user = res.data;
      window.close();
      // window.location.href = this.$route.query.from as string;

    } catch (err) {
      this.message = err.message;
      console.error(err.message);
    }
  }
}
</script>
