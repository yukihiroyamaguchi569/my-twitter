import './style.css'
import { supabase } from './supabaseClient.js'

document.querySelector('#app').innerHTML = `
  <section id="center">
    <h1>my-twitter</h1>
    <button id="login" type="button">Googleでログイン</button>
    <p id="user-info"></p>
  </section>
`

const loginButton = document.querySelector('#login')
const userInfo = document.querySelector('#user-info')

loginButton.addEventListener('click', async () => {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
})

async function showCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    userInfo.textContent = `ログイン中: ${user.email}`
    loginButton.style.display = 'none'
  } else {
    userInfo.textContent = 'ログインしていません'
  }
}

showCurrentUser()
