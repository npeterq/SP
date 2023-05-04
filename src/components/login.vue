<template>
  <div class="login-page">
    <div class="tips">
      <div v-show="loginType === 'key'">
      </div>
    </div>
    <div v-show="loginType === 'password'">

    </div>
    <div class="password" v-show="loginType === 'key'">
      <input type="password" v-model="password" autofocus @keydown="listenForEnter" @focus="passwordFocus = true"
             @blur="passwordFocus = false" placeholder="API key" enterkeyhint="go">
      <button @click="login" :disabled="trying"><i v-show="trying" class="iconfont spin">&#xe676;</i> Submit</button>
    </div>
    <div style="font-size: 14px;">
      <br>
      <p v-show="loginType === 'password'">
        
        <button class="plain" @click="loginType = 'key'">API Key</button>
      </p>
      <p v-show="loginType === 'key'">
        <button class="plain" @click="loginType = 'password'">Back to Sign in</button>
      </p>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import {nanoid} from 'nanoid'

export default {
  name: 'login',
  mounted() {
    this.id = nanoid(32)
    if (location.hostname === 'localhost') {
      this.url = `https://sso.jw1.dev/#/sign-in?from=chat_local&id=${this.id}&client_id=${USER_POOL_CLIENT_ID}`
    } else {
      this.url = `https://sso.jw1.dev/#/sign-in?from=chat&id=${this.id}&client_id=${USER_POOL_CLIENT_ID}`
    }
  },
  data() {
    return {
      id: '',
      passwordFocus: false,
      password: '',
      trying: false,
      loginType: 'password',
      url: ''
    }
  },
  methods: {
    goToSSO() {
      location.href = this.url
    },
    listenForEnter(e) {
      if (e.key === 'Enter' && this.password !== '' && this.passwordFocus) {
        this.login()
      }
    },
    verifyKey(cb) {
      let key = this.password
      if (!key.startsWith('sk-')) {
        cb && cb(false)
        alert('The token you entered seems to be invalid 🤔')
        return false
      }

      this.trying = true

      axios({
        url: 'https://api.openai.com/v1/moderations',
        headers: {
          'Authorization': 'Bearer ' + key
        },
        method: 'POST',
        data: {
          input: `Hello World!`
        }
      }).then(res => {
        console.log(res)
        cb && cb(true)
      }).catch(err => {
        console.log(err)
        err.response.status === 401 && alert('The key you entered seems to be invalid 🤔')
        cb && cb(false)
      }).finally(() => {
        this.trying = false
        this.password = ''
      })
    },
    login() {
      let _ = this
      if (_.password === '') {
        alert('A token is required')
        return false
      }

      _.verifyKey(function (res) {
        if (res) {
          localStorage.setItem('fromID', 'key_' + _.password)
          _.$emit('logged')
        }
      })
    }
  }
}
</script>