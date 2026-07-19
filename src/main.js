import './style.css'
import { supabase } from './supabaseClient.js'

document.querySelector('#app').innerHTML = `
  <section id="center">
    <h1>my-twitter</h1>
    <button id="login" type="button">Googleでログイン</button>
    <button id="logout" type="button" style="display: none;">サインアウト</button>
    <p id="user-info"></p>

    <div id="compose">
      <textarea id="tweet-body" placeholder="いまどうしてる？"></textarea>
      <label id="draft-option">
        <input id="is-draft" type="checkbox" />
        下書きとして投稿（自分にしか見えない）
      </label>
      <button id="post" type="button">ポスト</button>
    </div>

    <ul id="timeline"></ul>
  </section>
`

const loginButton = document.querySelector('#login')
const logoutButton = document.querySelector('#logout')
const userInfo = document.querySelector('#user-info')
const tweetBody = document.querySelector('#tweet-body')
const isDraftCheckbox = document.querySelector('#is-draft')
const postButton = document.querySelector('#post')
const timeline = document.querySelector('#timeline')

let currentUserId = null
let followingIds = new Set()

loginButton.addEventListener('click', async () => {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
})

logoutButton.addEventListener('click', async () => {
  await supabase.auth.signOut()
  await showCurrentUser()
  await loadFollowing()
  await loadTweets()
})

async function showCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    currentUserId = user.id
    userInfo.textContent = `ログイン中: ${user.email}`
    loginButton.style.display = 'none'
    logoutButton.style.display = ''
  } else {
    currentUserId = null
    userInfo.textContent = 'ログインしていません'
    loginButton.style.display = ''
    logoutButton.style.display = 'none'
  }
}

// ④ 自分がフォロー中のuser_id一覧を取得
async function loadFollowing() {
  if (!currentUserId) {
    followingIds = new Set()
    return
  }

  const { data, error } = await supabase
    .from('follows')
    .select('followee_id')
    .eq('follower_id', currentUserId)

  if (error) {
    console.error('フォロー一覧の取得に失敗しました:', error)
    return
  }

  followingIds = new Set(data.map((row) => row.followee_id))
}

async function toggleFollow(followeeId) {
  if (followingIds.has(followeeId)) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('followee_id', followeeId)

    if (error) {
      console.error('アンフォローに失敗しました:', error)
      return
    }
  } else {
    const { error } = await supabase
      .from('follows')
      .insert({ followee_id: followeeId })

    if (error) {
      console.error('フォローに失敗しました:', error)
      return
    }
  }

  await loadFollowing()
  await loadTweets()
}

// ② 投稿する（1行 追加 ＝ insert）
postButton.addEventListener('click', async () => {
  const body = tweetBody.value.trim()
  if (!body) return

  postButton.disabled = true // 連打による二重投稿を防ぐ
  try {
    const { error } = await supabase
      .from('tweets')
      .insert({ body, is_public: !isDraftCheckbox.checked })
      .select()

    if (error) {
      console.error('投稿に失敗しました:', error)
      return
    }

    tweetBody.value = ''
    isDraftCheckbox.checked = false
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

    const author = document.createElement('p')
    author.className = 'tweet-author'
    author.textContent = `投稿者ID: ${tweet.user_id}`

    const body = document.createElement('p')
    body.className = 'tweet-body'
    body.textContent = tweet.body // XSS対策のため textContent で挿入

    const time = document.createElement('time')
    time.className = 'tweet-time'
    time.textContent = new Date(tweet.created_at).toLocaleString()

    li.append(author, body, time)

    if (!tweet.is_public) {
      const badge = document.createElement('span')
      badge.className = 'tweet-draft-badge'
      badge.textContent = '下書き（自分にしか見えません）'
      li.append(badge)
    }

    if (currentUserId && tweet.user_id !== currentUserId) {
      const followButton = document.createElement('button')
      followButton.type = 'button'
      followButton.className = 'tweet-follow-button'
      const isFollowing = followingIds.has(tweet.user_id)
      followButton.textContent = isFollowing ? 'フォロー中' : 'フォロー'
      followButton.addEventListener('click', () => toggleFollow(tweet.user_id))
      li.append(followButton)
    }

    timeline.append(li)
  }
}

async function init() {
  await showCurrentUser()
  await loadFollowing()
  await loadTweets()
}

init()
