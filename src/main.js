import './style.css'
import { supabase } from './supabaseClient.js'

document.querySelector('#app').innerHTML = `
  <section id="center">
    <h1>my-twitter</h1>
    <button id="login" type="button">Googleでログイン</button>
    <p id="user-info"></p>

    <div id="compose">
      <textarea id="tweet-body" placeholder="いまどうしてる？"></textarea>
      <button id="post" type="button">ポスト</button>
    </div>

    <ul id="timeline"></ul>
  </section>
`

const loginButton = document.querySelector('#login')
const userInfo = document.querySelector('#user-info')
const tweetBody = document.querySelector('#tweet-body')
const postButton = document.querySelector('#post')
const timeline = document.querySelector('#timeline')

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

// ② 投稿する（1行 追加 ＝ insert）
postButton.addEventListener('click', async () => {
  const body = tweetBody.value.trim()
  if (!body) return

  postButton.disabled = true // 連打による二重投稿を防ぐ
  try {
    const { error } = await supabase
      .from('tweets')
      .insert({ body })
      .select()

    if (error) {
      console.error('投稿に失敗しました:', error)
      return
    }

    tweetBody.value = ''
    await loadTweets()
  } finally {
    postButton.disabled = false // 成功・失敗どちらでも必ず戻す
  }
})

// ③ 一覧を取り出す（読む ＝ select、新しい順）
async function loadTweets() {
  const { data, error } = await supabase
    .from('tweets')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('取得に失敗しました:', error)
    return
  }

  renderTweets(data)
}

function renderTweets(tweets) {
  timeline.innerHTML = ''
  for (const tweet of tweets) {
    const li = document.createElement('li')
    li.className = 'tweet'

    const body = document.createElement('p')
    body.className = 'tweet-body'
    body.textContent = tweet.body // XSS対策のため textContent で挿入

    const time = document.createElement('time')
    time.className = 'tweet-time'
    time.textContent = new Date(tweet.created_at).toLocaleString()

    li.append(body, time)
    timeline.append(li)
  }
}

showCurrentUser()
loadTweets()
