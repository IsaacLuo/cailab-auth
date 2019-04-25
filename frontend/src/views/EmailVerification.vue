<template>
  <div class="login">
    <img alt="logo" src="../assets/logo.png">
    <h1>Cailab</h1>
    <h2>{{this.step}}</h2>
    <p>{{this.message}}</p>
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
export default class EmailVerification extends Vue {
  private step!:string;
  private message!:string;

  public data() {
    return {
      step: 'initialising',
      message: '',
    };
  }

  public created() {
    const token = this.$route.params.token;
    this.onVerify(token);
  }

  public async onVerify(token:string) {
    try {
      const res = await axios.get(conf.serverURL + `/api/emailVerification/${token}`, {withCredentials: true});
      this.step = 'finish'
      this.message = 'email verified'
    } catch (err) {
      this.step = 'error'
      this.message = err.response.data.message;
      console.error(err.message);
    }
  }
}
</script>
