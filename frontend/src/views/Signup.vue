<template>
  <div class="login">
    <el-dialog
      title="sign up to Cailab"
      :visible="true"
      width="50%"
      :show-close="false"
      class="dialog"
    >
      <span slot="title" class="dialog-title">
        <img alt="logo" src="../assets/logo.png">
        <h1>sign up to cailab</h1>
      </span>
      <span>
        <el-form ref="form" :model="form" label-width="180px">
          <el-form-item label="email">
            <el-input v-model="form.email"></el-input>
          </el-form-item>
          <el-form-item label="password">
            <el-input type="password" v-model="form.password"></el-input>
          </el-form-item>
          <el-form-item label="password confirmation">
            <el-input type="password" v-model="form.passwordConfirmation"></el-input>
          </el-form-item>
          <el-form-item label="full name">
            <el-input v-model="form.name"></el-input>
          </el-form-item>
          <el-form-item class="alignRight">
            <router-link :to="`/login?from=${this.$route.query.from}`">already have an account? login</router-link>
          </el-form-item>
        </el-form>
        <div class="warning" v-if="this.message !== '' ">
          {{this.message}}
          </div>
      </span>
      <span slot="footer" class="dialog-footer">
        
        <el-button type="primary" @click="onSubmit">submit</el-button>
        <el-button @click="onCancel">Cancel</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<style scoped>
.alignRight 
{
  text-align: right;
}
.warning
{
  background-color: #ff7777;
  color: #fff;
  padding:5px;
}
</style>


<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import axios from 'axios';
import conf from '@/../conf';

interface IForm {
  email: string;
  password: string;
  passwordConfirmation: string;
  name: string;
}

@Component({
  components: {
  },
})
export default class Signup extends Vue {
  private form!: IForm;
  private message = '';

  public data() {
    return {
      form : {
        email: '',
        password: '',
        passwordConfirmation: '',
        name: '',
      },
      message: '',
    };
  }

  public onCancel(event: MouseEvent) {
    const from = this.$route.query.from as string;
    window.location.href = from;
  }

  public async onSubmit(event: MouseEvent) {
    const {email, password, passwordConfirmation, name} = this.form;
    try {
      if (name.length < 2) {
        throw new Error('please input your full name');
      }
      if (passwordConfirmation !== password) {
        throw new Error('password don\'t match');
      }
      if (!/^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/.test(email)) {
        throw new Error('email is invalid');
      }
      if (!(password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password))) {
        throw new Error('password should match complicity requirement');
      }
      const res = await axios.post(conf.serverURL + '/api/user', this.form, {withCredentials: true});
      window.location.href = this.$route.query.from as string;

    } catch (err) {
      console.log(err);
      if (err.response && err.response.status === 409) {
        this.message = 'email is already in use';
      } else {
        this.message = err.message;
      }
    }
  }
}
</script>
