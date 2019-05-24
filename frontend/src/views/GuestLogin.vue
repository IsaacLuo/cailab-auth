<template>
  <div class="login">
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
export default class GuestLogin extends Vue {
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

  public async created(event: MouseEvent) {
    try {
      const res = await axios.post(conf.serverURL + '/api/guestSession', this.form, {withCredentials: true});
      if (window.opener) {
        window.opener.postMessage({event: 'closed', success: true}, '*');
        window.close();
      } else {
        window.location.href = '/myProfile';
      }
    } catch (err) {
      alert('login as guest failed');
      if (window.opener) {
          window.opener.postMessage({event: 'closed', success: false}, '*');
          window.close();
        } else {
          window.location.href = '/myProfile';
        }
    }
  }
}
</script>
