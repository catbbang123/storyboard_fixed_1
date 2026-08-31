const $=id=>document.getElementById(id);

const SUPABASE_URL = 'https://udskdmndzupdgsrxjfbt.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_hFt0uuyB5EVIn7gCN-aQJQ_QVeAFWBB';

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage
        }
    }
);

async function updateAuthUI(session = null){

    // session을 전달받지 못했을 때만 Supabase에서 다시 확인
    if(session === null){
        const { data } = await supabaseClient.auth.getSession();
        session = data?.session || null;
    }

    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const profileBtn = document.getElementById('profileBtn');
    const profileAvatar = document.getElementById('profileAvatar');
    const profileMenu = document.getElementById('profileMenu');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');

    const createButtons = [
        document.getElementById('create'),
        document.getElementById('mobileCreate')
    ];

    // =========================
    // 로그아웃 상태
    // =========================
    if(!session){

        currentUserId = null;
        myWorldMemberships = [];
        
        if(googleLoginBtn){
            googleLoginBtn.style.display = '';
        }

        if(profileBtn){
            profileBtn.style.display = 'none';
        }

        if(profileMenu){
            profileMenu.style.display = 'none';
        }

        // 세계관 만들기 버튼 비활성화
        createButtons.forEach(btn => {
            if(btn){
                btn.disabled = true;
                btn.classList.add('login-required');
                btn.title = '로그인 후 세계관을 만들 수 있습니다.';
            }
        });

        return;
    }

    // =========================
    // 로그인 상태
    // =========================
    const user = session.user;
    const metadata = user.user_metadata || {};

    const name =
        metadata.full_name ||
        metadata.name ||
        user.email?.split('@')[0] ||
        '사용자';

    const avatar =
        metadata.avatar_url ||
        metadata.picture ||
        '';

    // Google 로그인 버튼 숨기기
    if(googleLoginBtn){
        googleLoginBtn.style.display = 'none';
    }

    // 프로필 버튼 표시
    if(profileBtn){
        profileBtn.style.display = 'flex';
    }

    // 프로필 이름
    if(profileName){
        profileName.textContent = name;
    }

    // 프로필 이메일
    if(profileEmail){
        profileEmail.textContent = user.email || '';
    }

    // 프로필 사진
    if(profileAvatar){

        if(avatar){
            profileAvatar.innerHTML =
                `<img src="${esc(avatar)}" alt="프로필 사진">`;
        }else{
            profileAvatar.textContent = '👤';
        }

    }

    // 세계관 만들기 버튼 활성화
    createButtons.forEach(btn => {
        if(btn){
            btn.disabled = false;
            btn.classList.remove('login-required');
            btn.title = '';
        }
    });
}

async function requireLogin(){

    const { data, error } = await supabaseClient.auth.getSession();

    if(error){
        console.error('로그인 상태 확인 실패:', error);
        alert('로그인 상태를 확인하지 못했습니다.');
        return false;
    }

    const session = data?.session;

    if(!session){
        alert('세계관을 만들려면 먼저 Google 로그인이 필요합니다.');
        return false;
    }

    return true;
}

async function logout(){

    const { error } =
        await supabaseClient.auth.signOut();

    if(error){

        console.error(
            '로그아웃 실패:',
            error
        );

        alert(
            '로그아웃에 실패했습니다.'
        );

        return;
    }

    // 로그아웃 상태 즉시 UI 반영
    await updateAuthUI(null);

    // 프로필 메뉴 닫기
    const profileMenu =
        document.getElementById('profileMenu');

    if(profileMenu){
        profileMenu.style.display = 'none';
    }

    // 홈으로 이동
    home();
}

document.addEventListener('DOMContentLoaded', async function () {

    // ==========================================
    // 페이지가 열리면 현재 로그인 상태 즉시 확인
    // ==========================================
    const { data } = await supabaseClient.auth.getSession();

    await updateAuthUI(data?.session || null);


    // ==========================================
    // 로그인 / 로그아웃 상태 변화 감지
    // ==========================================
supabaseClient.auth.onAuthStateChange((event, session) => {

    console.log('인증 상태 변경:', event, session);

    // 로그아웃되면 비공개 세계관 관련 정보 즉시 초기화
    if(!session){
        currentUserId = null;
        myWorldMemberships = [];

        // 현재 화면의 세계관 목록도 즉시 다시 그리기
        renderHome($('search').value);
    }

    updateAuthUI(session);
});


    // ==========================================
    // Google 로그인
    // ==========================================
    const googleLoginBtn =
        document.getElementById('googleLoginBtn');

    if(googleLoginBtn){

        googleLoginBtn.addEventListener('click', async () => {

            const { error } =
                await supabaseClient.auth.signInWithOAuth({

                    provider: 'google',

                    options: {
                        redirectTo: window.location.origin
                    }

                });

            if(error){

                console.error(
                    'Google 로그인 실패:',
                    error
                );

                alert(
                    'Google 로그인에 실패했습니다.'
                );
            }

        });

    }


    // ==========================================
    // 로그아웃
    // ==========================================
    const logoutBtn =
        document.getElementById('logoutBtn');

    if(logoutBtn){
        logoutBtn.addEventListener('click', logout);
    }


    // ==========================================
    // 프로필 메뉴
    // ==========================================
    const profileBtn =
        document.getElementById('profileBtn');

    const profileMenu =
        document.getElementById('profileMenu');


    if(profileBtn && profileMenu){

        profileBtn.addEventListener('click', (e) => {

            e.stopPropagation();

            const isOpen =
                profileMenu.style.display === 'block';

            profileMenu.style.display =
                isOpen ? 'none' : 'block';

        });

    }


    // ==========================================
    // 메뉴 바깥 클릭 → 닫기
    // ==========================================
    document.addEventListener('click', (e) => {

        if(
            profileMenu &&
            !e.target.closest('#profileBtn') &&
            !e.target.closest('#profileMenu')
        ){

            profileMenu.style.display = 'none';

        }

    });

});

async function loadCharactersFromSupabase(worldId){
    const { data, error } = await supabaseClient
        .from('characters')
        .select('*')
        .eq('world_id', worldId);

    if(error){
        console.error('Supabase 캐릭터 불러오기 실패:', error);
        return;
    }

    const world = worlds.find(w => w.id === worldId);

    if(!world) return;

    world.characters = (data || []).map(c => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        group: c.group_name || '',
        photo: c.photo || '',
         owner_id: c.owner_id || null
    }));
}

async function loadChaptersFromSupabase(storyId){
    const { data, error } = await supabaseClient
        .from('chapters')
        .select('*')
        .eq('story_id', storyId)
        .order('chapter_number', { ascending: true });

    if(error){
        console.error('Supabase 회차 불러오기 실패:', error);
        return [];
    }

    return data || [];
}

console.log('Supabase 연결 객체 생성 완료:', supabaseClient);

function updateCustomGenreField(){
 const wrap=$("customGenreWrap"), select=$("genre"), input=$("customGenre");
 if(!wrap||!select||!input)return;
 const isOther=select.value==="기타";
 wrap.classList.toggle("show",isOther);
 if(!isOther) input.value="";
}
function getGenreValue(){
 return $("genre").value==="기타" ? ($("customGenre").value.trim() || "기타") : $("genre").value;
}

let worlds=[],current=null,tab='overview',editId=null,deleteId=null,itemType=null,editingCharacterId=null,editingStoryId=null,editingChapterId=null,storyCover='',chapterStoryId=null,editingGenericId=null,genericPhoto='',myWorldMemberships=[],currentUserId=null;

let profilesCache={};

const defaults=[];

async function save(){

    const { data: { session } } =
      await supabaseClient.auth.getSession();

    const user = session?.user;

    if(!user){
        console.error('Supabase worlds 저장 실패: 로그인 세션이 없습니다.');
        alert('로그인 후 저장할 수 있습니다.');
        return false;
    }

    // 새로 만든 세계관에는 현재 로그인한 사용자를 소유자로 지정
    worlds.forEach(w => {
        if(!w.owner_id){
            w.owner_id = user.id;
        }
    });
    
    const rows = worlds
    .filter(w => w.owner_id === user.id)
    .map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        genre: w.genre,
        visibility: w.visibility,
        owner_id: w.owner_id,
        members: w.members ?? 1,
        icon: w.icon ?? '✦',
        theme: w.theme ?? 'purple',
        cover_image: w.coverImage ?? ''
    }));

    const { error } = await supabaseClient
        .from('worlds')
        .upsert(rows);

    if(error){
        console.error('Supabase worlds 저장 실패:', error);
        alert('세계관 저장에 실패했습니다.\n' + error.message);
        return false;
    }

    return true;
}

async function deleteWorldFromSupabase(id){

    if(!currentUserId){
        alert('로그인 후 세계관을 삭제할 수 있습니다.');
        return false;
    }
    
    const { data, error } = await supabaseClient
        .from('worlds')
        .delete()
        .eq('id', id)
        .select('id');

    if(error){
        console.error('Supabase 세계관 삭제 실패:', error);
        alert('세계관 삭제에 실패했습니다.\n' + error.message);
        return false;
    }

    if(!data || data.length === 0){
        console.error('Supabase에서 삭제된 세계관을 확인할 수 없습니다:', id);
        alert('세계관 삭제가 확인되지 않았습니다.');
        return false;
    }

    console.log('Supabase 세계관 삭제 완료:', id);

    return true;
}

function get(id){return worlds.find(x=>x.id===id)}function esc(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function force16x9(){
 document.querySelectorAll('.cover,.hero').forEach(el=>{
   const width=el.getBoundingClientRect().width;
   if(width>0) el.style.height=Math.round(width*9/16)+'px';
 });
}
window.addEventListener('resize',()=>requestAnimationFrame(force16x9));

async function load(){
    // ① 세계관 불러오기
    const { data, error } = await supabaseClient
        .from('worlds')
        .select('*')
        .order('name', { ascending: true });

    if(error){
        console.error('Supabase worlds 불러오기 실패:', error);
        alert('Supabase에서 세계관을 불러오지 못했습니다.\n' + error.message);
        worlds = [];
        return;
    }

    // ①-1 현재 로그인 사용자의 세계관 멤버십 불러오기
    myWorldMemberships = [];

    const { data: currentUserData } =
        await supabaseClient.auth.getUser();

    currentUserId = currentUserData?.user?.id;

    // ①-2 사용자 닉네임 불러오기
    const { data: profileData, error: profileError } =
        await supabaseClient
            .from('profiles')
            .select('user_id, nickname');

    if(profileError){
        console.error(
            'Supabase profiles 불러오기 실패:',
            profileError
        );
    }else{
        profilesCache = {};

        (profileData || []).forEach(profile => {
            profilesCache[profile.user_id] =
                profile.nickname || '사용자';
        });
    }
    
    if(currentUserId){
        const { data: membershipData, error: membershipError } =
            await supabaseClient
                .from('world_members')
                .select('world_id, role, status')
                .eq('user_id', currentUserId);

        if(membershipError){
            console.error(
                'Supabase world_members 불러오기 실패:',
                membershipError
            );
        }else{
            myWorldMemberships = membershipData || [];
        }
    }
    
    // ② 캐릭터 불러오기
    const { data: characterData, error: characterError } = await supabaseClient
        .from('characters')
        .select('*');

    if(characterError){
        console.error('Supabase characters 불러오기 실패:', characterError);
        alert('Supabase에서 캐릭터를 불러오지 못했습니다.\n' + characterError.message);
        return;
    }

    // ③ 지역 불러오기
    const { data: locationData, error: locationError } = await supabaseClient
        .from('locations')
        .select('*');

    if(locationError){
        console.error('Supabase locations 불러오기 실패:', locationError);
        alert('Supabase에서 지역을 불러오지 못했습니다.\n' + locationError.message);
        return;
    }

    // ④ 세계관 설정 불러오기
    const { data: settingsData, error: settingsError } = await supabaseClient
        .from('world_settings')
        .select('*');

    if(settingsError){
        console.error('Supabase world_settings 불러오기 실패:', settingsError);
        alert('Supabase에서 세계관 설정을 불러오지 못했습니다.\n' + settingsError.message);
        return;
    }

// ⑤ 소설 불러오기 (수정)
    const { data: storyData, error: storyError } = await supabaseClient
        .from('stories')
        .select('*')
        .order('created_at', { ascending: true });

    if(storyError){
        console.error('Supabase stories 불러오기 실패:', storyError);
        alert('Supabase에서 소설 데이터를 불러오지 못했습니다.\n' + storyError.message);
        return;
    }

    // ⑤-1 회차 데이터 전체 불러오기 추가
    const { data: chapterData, error: chapterError } = await supabaseClient
        .from('chapters')
        .select('*')
        .order('chapter_number', { ascending: true });

    if(chapterError){
        console.error('Supabase chapters 불러오기 실패:', chapterError);
        // 회차 테이블이 따로 없다면 빈 배열로 처리
    }

    // ⑥ Supabase 데이터를 기준으로 화면 데이터를 완전히 교체
    // 이전에 브라우저에 남아 있던 세계관/캐릭터가 다시 나타나지 않도록 합니다.
    worlds = (data || []).map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        genre: w.genre,
        visibility: w.visibility,
        owner_id: w.owner_id,
        members: w.members ?? 1,
        icon: w.icon ?? '✦',
        theme: w.theme ?? 'purple',
        coverImage: w.cover_image ?? '',
        joined: false,
        createdAt: w.created_at ? new Date(w.created_at).getTime() : 0,

        // 캐릭터
        characters: (characterData || [])
            .filter(c => c.world_id === w.id)
            .map(c => ({
                id: c.id,
                name: c.name,
                description: c.description || '',
                group: c.group_name || '',
                photo: c.photo || '',
                owner_id: c.owner_id || null
            })),

        // 지역
        locations: (locationData || [])
            .filter(l => l.world_id === w.id)
            .map(l => ({
                id: l.id,
                name: l.name,
                description: l.description || '',
                group: l.group_name || '',
                photo: l.photo || ''
            })),

// 소설 (수정)
        stories: (storyData || [])
            .filter(st => st.world_id === w.id)
            .map(st => ({
                id: st.id,
                name: st.name,
                description: st.description || '',
                visibility: st.visibility || 'public',
                coverImage: st.cover_image || '',
                // Supabase의 chapters 테이블에서 해당 story_id와 일치하는 회차들을 매핑
                chapters: (chapterData || [])
                    .filter(ch => ch.story_id === st.id)
                    .map(ch => ({
                        id: ch.id,
                        name: ch.title || ch.name, // 컬럼명에 따라 맞춤
                        body: ch.body || ch.content || '',
                        createdAt: ch.created_at ? new Date(ch.created_at).getTime() : 0
                    })),
                createdAt: st.created_at ? new Date(st.created_at).getTime() : 0,
                updatedAt: st.updated_at ? new Date(st.updated_at).getTime() : 0
            })),

        // 세계관 설정
        settings: (settingsData || [])
            .filter(s => s.world_id === w.id)
            .map(s => ({
                id: s.id,
                name: s.name,
                description: s.description || '',
                group: s.group_name || '세계관 기본 설정',
                photo: s.photo || ''
            }))
    }));

    console.log('Supabase 세계관 불러오기 완료:', worlds);
    console.log('Supabase 캐릭터 불러오기 완료:', characterData);
    console.log('Supabase 지역 불러오기 완료:', locationData);
    console.log('Supabase 세계관 설정 불러오기 완료:', settingsData);
    console.log('Supabase 소설 불러오기 완료:', storyData);

    // ⑤ 새로고침 전 현재 위치 복원
    const savedWorld = sessionStorage.getItem('storyboard_current_world');
    const savedTab = sessionStorage.getItem('storyboard_current_tab');

    if(savedWorld && worlds.some(w => w.id === savedWorld)){
        current = savedWorld;
        tab = savedTab || 'overview';

        renderWorld();

        // 중요:
        // load()는 Supabase에서 데이터를 비동기로 가져오기 때문에
        // 회차/스토리 화면 복원 코드는 반드시 데이터 로딩이 끝난 뒤 실행해야 합니다.
        // 기존 코드는 load() 바깥에서 실행되어 current가 아직 null인 상태였고,
        // 새로고침 시 회차 화면이 복원되지 않았습니다.
        restoreStoryView();
    }else{
        current = null;
        tab = 'overview';

        // 이전에 잘못 남아 있는 상세 화면 상태가 있더라도
        // 세계관이 없으면 홈으로 돌아갑니다.
        sessionStorage.removeItem('storyboard_current_reader');
        sessionStorage.removeItem('storyboard_current_story');
        sessionStorage.removeItem('storyboard_current_chapter');

        renderHome($('search').value);
    }
}

// 새로고침 전 마지막으로 보던 스토리/회차 화면 복원
function restoreStoryView(){
    const savedReader = sessionStorage.getItem('storyboard_current_reader');
    const savedStory = sessionStorage.getItem('storyboard_current_story');
    const savedChapter = sessionStorage.getItem('storyboard_current_chapter');

    if(!savedReader || !savedStory || !current) return;

    const world = worlds.find(w => w.id === current);
    const story = world?.stories?.find(s => s.id === savedStory);

    if(!story) return;

    // 스토리 설정 / 회차 목록 화면
    if(savedReader === 'storySettings'){
        tab = 'stories';
        sessionStorage.setItem('storyboard_current_tab', 'stories');

        // renderWorld()가 끝난 다음 상세 화면으로 전환
        requestAnimationFrame(() => {
            renderStorySettings(savedStory);
        });
        return;
    }

    // 회차 본문 화면
    if(savedReader === 'chapter' && savedChapter !== null){
        const chapterIndex = Number(savedChapter);

        if(
            Number.isInteger(chapterIndex) &&
            chapterIndex >= 0 &&
            chapterIndex < story.chapters.length
        ){
            tab = 'stories';
            sessionStorage.setItem('storyboard_current_tab', 'stories');

            requestAnimationFrame(() => {
                renderChapterReader(savedStory, chapterIndex);
            });
        }else{
            // 삭제된 회차 등으로 저장된 인덱스가 유효하지 않은 경우
            // 안전하게 회차 목록으로 복원합니다.
            renderStorySettings(savedStory);
        }
    }
}

function home(){
    current=null;
    sessionStorage.removeItem('storyboard_current_reader');
    sessionStorage.removeItem('storyboard_current_story');
    sessionStorage.removeItem('storyboard_current_chapter');
    sessionStorage.removeItem('storyboard_current_world');
    sessionStorage.setItem('storyboard_current_tab','overview');
    tab='overview';
    $('home').classList.remove('hidden');
    $('world').classList.add('hidden');
    renderHome($('search').value);
}
function renderHome(q=''){
    let k=q.toLowerCase().trim();

    // 로그아웃 상태에서는 비공개 세계관을 목록에서 숨김
    let visibleWorlds = worlds.filter(w => {
if(w.visibility === 'private'){
    const isOwner = w.owner_id === currentUserId;

    const isApprovedMember = myWorldMemberships.some(
        member =>
            member.world_id === w.id &&
            member.status === 'approved'
    );

    const canAddContent = isOwner || isApprovedMember;

    if(!isOwner && !isApprovedMember){
        return false;
    }
}

        return true;
    });

    let list = visibleWorlds.filter(w =>
        (w.name + w.description + w.genre)
            .toLowerCase()
            .includes(k)
    );

    $('grid').innerHTML = list.length
        ? list.map(card).join('')
        : '<div class="empty">🔍<br>검색 결과가 없습니다.</div>';

    $('recent').innerHTML = [...visibleWorlds]
        .sort((a,b) => b.createdAt - a.createdAt)
        .slice(0,5)
        .map(w => `
            <div data-open="${w.id}">
                <i>${esc(w.icon)}</i>
                <section>
                    <b>${esc(w.name)}</b>
                    <p>${esc(w.description)}</p>
                </section>
            </div>
        `)
        .join('');

    bind();
    requestAnimationFrame(force16x9);
}
function card(w){return `<article class="card" data-id="${w.id}"><div class="cover ${w.theme} ${w.coverImage?'has-photo':''}" ${w.coverImage?`style="background-image:url('${w.coverImage}')"`:''}>${w.coverImage?'':esc(w.icon)}</div><div class="more"><button>⋮</button><div class="menu"><button class="edit">✏️ 수정</button><button class="decorate">🎨 꾸미기</button><button class="join">👥 ${w.joined?'가입됨':'가입하기'}</button><button class="del">🗑️ 세계관 삭제</button></div></div><div class="info"><h3>${esc(w.name)}</h3><p>${esc(w.description)}</p><div class="meta"><span>👥 ${w.members}명</span><span>${esc(w.genre)}</span><span>${w.visibility==='public'?'공개':'비공개'}</span></div></div></article>`}
function bind(){document.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>openWorld(x.dataset.open));document.querySelectorAll('.card').forEach(c=>{let id=c.dataset.id,m=c.querySelector('.menu');c.onclick=e=>{if(!e.target.closest('.more'))openWorld(id)};c.querySelector('.more>button').onclick=e=>{e.stopPropagation();document.querySelectorAll('.menu.show').forEach(x=>x.classList.remove('show'));m.classList.add('show')};c.querySelector('.edit').onclick=()=>openModal(id);c.querySelector('.decorate').onclick=()=>openModal(id,true);c.querySelector('.join').onclick=()=>join(id);c.querySelector('.del').onclick=()=>openDelete(id)})}

async function openWorld(id){
    if(!get(id)) return;

    current=id;

    if(!tab){
        tab='overview';
    }

    sessionStorage.setItem('storyboard_current_world', id);
    sessionStorage.setItem('storyboard_current_tab', tab);

    await loadCharactersFromSupabase(id);

    renderWorld();
}

function renderWorld(){
    let w=get(current);
    const isOwner = w.owner_id === currentUserId;
    const isApprovedMember = myWorldMemberships.some(
        member => member.world_id === w.id && member.status === 'approved'
    );
    
    $('home').classList.add('hidden');
    $('world').classList.remove('hidden');let tabs=[['overview','개요'],['characters','캐릭터'],['locations','지역'],['stories','소설'],['settings','세계관 설정']];let body;if(tab==='overview')body=`<div class="join"><span><b>${w.joined?'가입한 세계관입니다.':'이 세계관에 참여해보세요.'}</b><br><small>${w.members}명이 함께하고 있습니다.</small></span><button id="pageJoin">${w.joined?'가입 취소':'세계관 가입'}</button></div><h2>세계관 소개</h2><p>${esc(w.description)}</p>`;else body=section(w);$('world').innerHTML=`<div class="hero ${w.theme} ${w.coverImage?'has-photo':''}" ${w.coverImage?`style="background-image:url('${w.coverImage}')"`:''}><button class="back" id="back">← 목록</button><div class="actions"><button id="editPage">✏️ 수정</button><button id="decoratePage">🎨 꾸미기</button></div><div><h1>${esc(w.name)}</h1><p>${esc(w.description)}</p></div></div><div class="tabs">${tabs.map(t=>`<button class="${tab===t[0]?'active':''}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div><div class="content">${body}</div>`;$('back').onclick=home;
    $('editPage').onclick=()=>{
    if(!isOwner && !isApprovedMember){
        alert('로그인 후 수정할 수 있습니다.');
        return;
    }
    openModal(w.id);
};

$('decoratePage').onclick=()=>{
    if(!isOwner && !isApprovedMember){
        alert('로그인 후 꾸밀 수 있습니다.');
        return;
    }
    openModal(w.id,true);
};

document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
    tab=b.dataset.tab;
    sessionStorage.setItem('storyboard_current_tab',tab);
    renderWorld();
});
if($('pageJoin'))$('pageJoin').onclick=()=>join(w.id);if($('add'))$('add').onclick=()=>openItem(tab);requestAnimationFrame(force16x9)}

function section(w){
    let labels={
        characters:'캐릭터',
        locations:'지역',
        stories:'소설',
        settings:'세계관 설정'
    };

    const isOwner = w.owner_id === currentUserId;

    const isApprovedMember = myWorldMemberships.some(
        member =>
            member.world_id === w.id &&
            member.status === 'approved'
    );

    const canAddContent = isOwner || isApprovedMember;

    if(tab==='stories'){
        return `<div class="content-head">
            <div>
                <h2>소설</h2>
                <small>스토리 표지를 만들고, 설정에서 회차를 작성할 수 있습니다.</small>
            </div>
            ${canAddContent ? '<button id="add">＋ 스토리 추가</button>' : ''}
        </div>`+

        (w.stories.length
        ? `<div class="story-grid">${w.stories.map(s=>`
            <article class="story-card">
                <div class="story-card-cover">
                    ${s.coverImage
                        ? `<img src="${s.coverImage}" alt="${esc(s.name)}">`
                        : '📖'}
                </div>

                <div class="story-card-info">
                    <h3>${esc(s.name)}</h3>
                    <p>${esc(s.description||'')}</p>

                    <div class="meta">
                        <span>📚 ${s.chapters?.length||0}화</span>
                        <span>${s.visibility==='public'?'공개':'비공개'}</span>
                    </div>

                    <div class="story-card-actions">

                        ${canAddContent
                            ? `<button class="story-chapter-btn"
                                data-story-chapters="${s.id}">
                                ✍️ 회차 쓰기
                               </button>`
                            : ''}

                        ${canAddContent
                            ? `<button class="story-edit-btn"
                                data-story-edit="${s.id}">
                                ⚙️ 설정
                               </button>`
                            : ''}

                        ${canAddContent
                            ? `<button class="story-delete-btn"
                                data-story-delete="${s.id}">
                                🗑️ 삭제
                               </button>`
                            : ''}

                    </div>
                </div>
            </article>
        `).join('')}</div>`
        : `<div class="empty">
            아직 스토리가 없습니다.<br><br>
            ${canAddContent
                ? '＋ 스토리 추가 버튼을 눌러 표지와 기본 설정부터 만들어보세요.'
                : '이 세계관에 가입하면 스토리를 추가할 수 있습니다.'}
        </div>`);
    }

    if(tab==='characters'){
        const order=[
            '주요 인물',
            '조연',
            '적대 세력',
            '왕족 / 귀족',
            '군대 / 기사단',
            '기타'
        ];

        const groups=[
            ...new Set(
                w.characters.map(c=>c.group||'기타')
            )
        ].sort((a,b)=>{
            let ai=order.indexOf(a),
                bi=order.indexOf(b);

            if(ai<0)ai=99;
            if(bi<0)bi=99;

            return ai-bi;
        });

        return `<div class="content-head">
            <div>
                <h2>캐릭터</h2>
                <small>캐릭터를 그룹별로 정리합니다.</small>
            </div>
            ${canAddContent
                ? '<button id="add">＋ 캐릭터 추가</button>'
                : ''}
        </div>`+

        (groups.length
        ? groups.map(g=>{
            const chars=w.characters.filter(
                c=>(c.group||'기타')===g
            );

            return `
                <div class="character-group-title">
                    <h3>${esc(g)}</h3>
                    <span class="character-group-count">
                        ${chars.length}명
                    </span>
                </div>

                <div class="character-grid">
                    ${chars.map(c=>`
                        <article class="character-card">

                            <div class="character-card-photo">
                                ${c.photo
                                    ? `<img src="${c.photo}" alt="${esc(c.name)}">`
                                    : '🧑‍🎨'}
                            </div>

<div class="character-card-info">
    <h3>${esc(c.name)}</h3>

    <small class="author-name">
        👤 ${esc(profilesCache[c.owner_id] || '사용자')}
    </small>

    <p>${esc(c.description||'')}</p>

                                <div class="character-card-actions">

                                    <button
                                        class="character-edit"
                                        data-character-id="${c.id}">
                                        ✏️ 수정
                                    </button>

                                    <button
                                        class="character-delete"
                                        data-character-id="${c.id}">
                                        🗑️ 삭제
                                    </button>

                                </div>
                            </div>

                        </article>
                    `).join('')}
                </div>
            `;
        }).join('')
        : `<div class="empty">
            아직 캐릭터가 없습니다.<br><br>
            ${canAddContent
                ? '＋ 캐릭터 추가 버튼으로 첫 캐릭터를 만들어보세요.'
                : '이 세계관에 가입하면 캐릭터를 추가할 수 있습니다.'}
        </div>`);
    }

    let arr=w[tab]||[];

    const groupNames=[
        ...new Set(
            arr.map(x=>x.group||'기본')
        )
    ];

    return `
        <div class="content-head">
            <div>
                <h2>${labels[tab]}</h2>
                <small>
                    ${tab==='locations'
                        ? '지역을 그룹별로 정리하고 사진을 넣을 수 있습니다.'
                        : '세계관 설정을 그룹별로 정리하고 사진을 넣을 수 있습니다.'}
                </small>
            </div>

            ${canAddContent
                ? '<button id="add">＋ 추가</button>'
                : ''}
        </div>`+

        (arr.length
        ? groupNames.map(g=>{
            const items=arr.filter(
                x=>(x.group||'기본')===g
            );

            return `
                <div class="generic-group-title">
                    <h3>${esc(g)}</h3>
                    <span class="generic-group-count">
                        ${items.length}개
                    </span>
                </div>

                <div class="generic-grid">
                    ${items.map(x=>`
                        <article class="generic-card">

                            <div class="generic-card-photo">
                                ${x.photo
                                    ? `<img src="${x.photo}" alt="${esc(x.name)}">`
                                    : '🖼️'}
                            </div>

                            <div class="generic-card-info">
                                <h3>${esc(x.name)}</h3>
                                <p>${esc(x.description||'')}</p>

                                <div class="generic-card-actions">

                                    <button
                                        class="generic-edit"
                                        data-generic-edit="${x.id}">
                                        ✏️ 수정
                                    </button>

                                    <button
                                        class="generic-delete"
                                        data-generic-delete="${x.id}">
                                        🗑️ 삭제
                                    </button>

                                </div>
                            </div>

                        </article>
                    `).join('')}
                </div>
            `;
        }).join('')
        : `<div class="empty">
            아직 등록된 항목이 없습니다.<br><br>
            ${canAddContent
                ? '＋ 추가 버튼으로 첫 항목을 만들어보세요.'
                : '이 세계관에 가입하면 등록할 수 있습니다.'}
        </div>`);
}

function setStoryCoverPreview(src=''){
 storyCover=src||'';
 const p=$('storyCoverPreview');
 p.innerHTML=src?`<img src="${src}" alt="스토리 표지 미리보기">`:`<span>📖</span><small>스토리 표지를 선택하세요.</small>`;
 if($('removeStoryCover')) $('removeStoryCover').style.display=src?'inline-block':'none';
}
function processStoryCover(file){
 if(!file) return;
 openImageCropModal(file,'storyCover',3/4,result=>{
  setStoryCoverPreview(result);
 });
}

async function saveStoryToSupabase(story){
    const row={
        id:story.id,
        world_id:current,
        name:story.name,
        description:story.description || '',
        visibility:story.visibility || 'public',
        cover_image:story.coverImage || '',
        updated_at:new Date().toISOString()
    };

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    const user = session?.user;

    if(!user){
        alert('로그인 후 저장할 수 있습니다.');
        return false;
    }

    const {data,error}=await supabaseClient
        .from('stories')
        .upsert(row,{onConflict:'id'})
        .select()
        .single();

    if(error){
        console.error('Supabase 소설 저장 실패:',error);
        alert('소설 저장에 실패했습니다.\n'+error.message);
        return false;
    }

 story.createdAt=data?.created_at ? new Date(data.created_at).getTime() : (story.createdAt || Date.now());
 story.updatedAt=data?.updated_at ? new Date(data.updated_at).getTime() : Date.now();
 return true;
}

function openStoryModal(id=null){
 editingStoryId=id;
 const w=get(current),s=id?w?.stories.find(x=>x.id===id):null;
 itemType='stories';
 $('ititle').textContent=id?'스토리 설정':'새 스토리 만들기';
 $('iname').value=s?.name||'';
 $('idesc').value=s?.description||'';
 $('characterFields').style.display='none';
 $('genericFields').style.display='none';
 $('storyFields').style.display='block';
 genericPhoto='';
 $('storyVisibility').value=s?.visibility||'public';
 $('storyCoverFile').value='';
 setStoryCoverPreview(s?.coverImage||'');

 $('itemModal').classList.add('show');
}
async function deleteStory(id){
 const w=get(current),s=w?.stories.find(x=>x.id===id);if(!s)return;
 if(!confirm(`"${s.name}" 스토리를 삭제하시겠습니까?\\n스토리와 모든 회차가 삭제됩니다.`))return;

const { data: { session } } =
    await supabaseClient.auth.getSession();

const user = session?.user;

if(!user){
    alert('로그인 후 소설을 삭제할 수 있습니다.');
    return false;
}

const world = get(current);

if(!world || world.owner_id !== user.id){
    alert('이 세계관의 소유자만 소설을 삭제할 수 있습니다.');
    return false;
}
    
 const {data,error}=await supabaseClient
   .from('stories')
   .delete()
   .eq('id',id)
   .select('id');

 if(error){
   console.error('Supabase 소설 삭제 실패:',error);
   alert('소설 삭제에 실패했습니다.\\n'+error.message);
   return;
 }

 if(!data || data.length===0){
   alert('Supabase에서 소설 삭제를 확인하지 못했습니다.');
   return;
 }

 w.stories=w.stories.filter(x=>x.id!==id);
 renderWorld();
}

async function openChapterModal(storyId,chapterId=null){

    const w=get(current);

    if(!w)return;

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    const user=session?.user;

    if(!user){
        alert('로그인 후 회차를 작성하거나 수정할 수 있습니다.');
        return;
    }

    if(w.owner_id !== user.id){
        alert('이 세계관의 소유자만 회차를 작성하거나 수정할 수 있습니다.');
        return;
    }

    const s=w.stories.find(x=>x.id===storyId);
    if(!s)return;

    const c=chapterId?s.chapters.find(x=>x.id===chapterId):null;

    chapterStoryId=storyId;
    editingChapterId=chapterId;

    $('chapterTitle').textContent=chapterId?'회차 수정':'새 회차 쓰기';
    $('chapterName').value=c?.name||`${(s.chapters.length||0)+1}화`;
    $('chapterBody').value=c?.body||'';

    $('chapterModal').classList.add('show');
}

async function saveChapter(){
    const w=get(current),s=w?.stories.find(x=>x.id===chapterStoryId);
    if(!s)return;

    const name=$('chapterName').value.trim(),body=$('chapterBody').value;
    if(!name)return alert('회차 제목을 입력해주세요.');

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    const user=session?.user;

    if(!user){
        alert('로그인 후 회차를 작성하거나 수정할 수 있습니다.');
        return;
    }

    if(w.owner_id !== user.id){
        alert('이 세계관의 소유자만 회차를 작성하거나 수정할 수 있습니다.');
        return;
    }

    const chapterId = editingChapterId
        || ('chapter-'+Date.now()+'-'+Math.random().toString(36).slice(2,7));

    // Supabase chapters 테이블에 저장할 데이터
    const chapterRow = {
        id: chapterId,
        story_id: chapterStoryId,
        chapter_number: editingChapterId
            ? (s.chapters.findIndex(x => x.id === editingChapterId) + 1)
            : (s.chapters.length + 1),
        name: name,
        body: body,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabaseClient
        .from('chapters')
        .upsert(chapterRow);

    if(error){
        console.error('Supabase 회차 저장 실패:', error);
        alert('회차 저장에 실패했습니다.\n' + error.message);
        return;
    }

    if(editingChapterId){
        const c=s.chapters.find(x=>x.id===editingChapterId);
        if(c){c.name=name;c.body=body;}

 }else{
   s.chapters.push({
     id: chapterId,
     name,
     body,
     createdAt: Date.now()
   });
 }

 $('chapterModal').classList.remove('show');
 editingChapterId=null;
 chapterStoryId=null;
 
 // 화면을 새로고침해도 소설 설정/회차 목록에 머물도록 처리
 renderStorySettings(s.id);
}

function renderStorySettings(storyId){

    const w = get(current);
    const s = w?.stories.find(x => x.id === storyId);

    if(!s) return;

    // 새로고침 시 현재 위치 기억
    sessionStorage.setItem('storyboard_current_world', current);
    sessionStorage.setItem('storyboard_current_tab', 'stories');
    sessionStorage.setItem('storyboard_current_reader', 'storySettings');
    sessionStorage.setItem('storyboard_current_story', storyId);
    sessionStorage.removeItem('storyboard_current_chapter');

    $('world').innerHTML = `
        <div class="hero ${w.theme} ${w.coverImage ? 'has-photo' : ''}"
            ${w.coverImage ? `style="background-image:url('${w.coverImage}')"` : ''}>

            <button class="back" id="back">
                ← 소설 목록
            </button>

            <div>
                <h1>${esc(s.name)}</h1>
                <p>${esc(s.description || '')}</p>
            </div>
        </div>

        <div class="content" style="margin-top:18px">

            <div class="content-head">

                <div>
                    <h2>스토리 설정</h2>
                    <small>
                        표지와 기본 정보를 관리하고 회차를 작성합니다.
                    </small>
                </div>

                <button id="storySettingsEdit">
                    ⚙️ 스토리 설정 수정
                </button>

            </div>


            <div class="story-grid"
                style="max-width:260px;margin-top:18px">

                <div class="story-card">

                    <div class="story-card-cover">
                        ${
                            s.coverImage
                            ? `<img src="${esc(s.coverImage)}" alt="">`
                            : '📖'
                        }
                    </div>

                </div>

            </div>


            <div class="chapter-list">

                <div class="content-head">

                    <h2>회차</h2>

                    <button id="writeChapter">
                        ＋ 회차 쓰기
                    </button>

                </div>


                ${
                    s.chapters.length
                    ?

                    s.chapters.map((c, i) => `

                        <div class="chapter-row">

                            <div class="chapter-info">

                                <strong>
                                    ${esc(c.name || `${i + 1}화`)}
                                </strong>

                                <small>
                                    · ${
                                        c.body
                                        ? c.body.length + '자'
                                        : '내용 없음'
                                    }
                                </small>

                            </div>


                            <div class="chapter-actions">

                                <button
                                    type="button"
                                    class="chapter-view-btn"
                                    data-story-id="${esc(s.id)}"
                                    data-chapter-id="${esc(c.id)}"
                                >
                                    📖 본문 보기
                                </button>


                                <button
                                    type="button"
                                    data-edit-chapter="${esc(c.id)}"
                                >
                                    ✏️ 수정
                                </button>


                                <button
                                    type="button"
                                    class="chapter-delete-btn"
                                    data-story-id="${esc(s.id)}"
                                    data-delete-chapter="${esc(c.id)}"
                                >
                                    🗑️ 삭제
                                </button>

                            </div>

                        </div>

                    `).join('')

                    :

                    `
                    <div class="empty">
                        아직 작성된 회차가 없습니다.
                    </div>
                    `
                }

            </div>

        </div>
    `;


    // ============================
    // 소설 목록으로
    // ============================

    $('back').onclick = () => {

        tab = 'stories';

        sessionStorage.setItem(
            'storyboard_current_tab',
            'stories'
        );

        sessionStorage.removeItem(
            'storyboard_current_reader'
        );

        sessionStorage.removeItem(
            'storyboard_current_story'
        );

        sessionStorage.removeItem(
            'storyboard_current_chapter'
        );

        renderWorld();

    };


    // ============================
    // 스토리 설정 수정
    // ============================

    $('storySettingsEdit').onclick = () => {

        openStoryModal(storyId);

    };


    // ============================
    // 회차 쓰기
    // ============================

    $('writeChapter').onclick = () => {

        openChapterModal(storyId);

    };


    // ============================
    // 본문 보기
    // ============================

    document
        .querySelectorAll('.chapter-view-btn')
        .forEach(button => {

            button.onclick = function(e){

                e.preventDefault();
                e.stopPropagation();

                const storyId =
                    this.dataset.storyId;

                const chapterId =
                    this.dataset.chapterId;

                console.log(
                    '본문 보기 클릭:',
                    storyId,
                    chapterId
                );

                openChapterReader(
                    storyId,
                    chapterId
                );

            };

        });


    // ============================
    // 회차 수정
    // ============================

    document
        .querySelectorAll('[data-edit-chapter]')
        .forEach(button => {

            button.onclick = function(e){

                e.preventDefault();
                e.stopPropagation();

                openChapterModal(
                    storyId,
                    this.dataset.editChapter
                );

            };

        });


    // ============================
    // 회차 삭제
    // ============================

    document
        .querySelectorAll('[data-delete-chapter]')
        .forEach(button => {

            button.onclick = function(e){

                e.preventDefault();
                e.stopPropagation();

                deleteChapter(
                    this.dataset.storyId,
                    this.dataset.deleteChapter
                );

            };

        });

}

function openChapterReader(storyId, chapterId){
 const w=get(current);
 if(!w)return;

 const s=w.stories.find(x=>x.id===storyId);
 if(!s||!s.chapters?.length)return;

 const index=s.chapters.findIndex(x=>x.id===chapterId);
 if(index<0)return;

 renderChapterReader(storyId,index);
}

function renderChapterReader(storyId,index){
 const w=get(current);
 if(!w)return;

 const s=w.stories.find(x=>x.id===storyId);
 if(!s||!s.chapters?.length)return;

 if(index<0)index=0;
 if(index>=s.chapters.length)index=s.chapters.length-1;
sessionStorage.setItem('storyboard_current_world', current);
sessionStorage.setItem('storyboard_current_reader', 'chapter');
sessionStorage.setItem('storyboard_current_story', storyId);
sessionStorage.setItem('storyboard_current_chapter', String(index));

 const c=s.chapters[index];
 const previous=s.chapters[index-1];
 const next=s.chapters[index+1];

 $('world').innerHTML=`
 <div class="hero ${w.theme} ${w.coverImage?'has-photo':''}" ${w.coverImage?`style="background-image:url('${w.coverImage}')"`:''}>
   <button class="back" id="readerBack">← 회차 목록</button>
   <div>
     <h1>${esc(s.name||'스토리')}</h1>
     <p>${esc(s.description||'')}</p>
   </div>
 </div>

 <div class="content chapter-reader-page">
   <div class="chapter-reader-head">
     <div>
       <small>${esc(s.name||'스토리')} · ${index+1} / ${s.chapters.length}화</small>
       <h2>${esc(c.name||`${index+1}화`)}</h2>
     </div>
   </div>

   <article class="chapter-reader-body">${esc(c.body||'아직 작성된 본문이 없습니다.')}</article>

   <div class="chapter-reader-navigation">
     ${previous?`
       <button class="chapter-nav-btn previous" data-reader-story="${s.id}" data-reader-index="${index-1}">
         ← 이전 글
       </button>
     `:'<span></span>'}

     <button class="chapter-list-btn" id="readerList">회차 목록</button>

     ${next?`
       <button class="chapter-nav-btn next" data-reader-story="${s.id}" data-reader-index="${index+1}">
         다음 글 →
       </button>
     `:'<span></span>'}
   </div>
 </div>`;

 $('readerBack').onclick=()=>renderStorySettings(storyId);
 $('readerList').onclick=()=>renderStorySettings(storyId);

 document.querySelectorAll('[data-reader-index]').forEach(btn=>{
   btn.onclick=()=>{
     renderChapterReader(
       btn.dataset.readerStory,
       Number(btn.dataset.readerIndex)
     );
     window.scrollTo({top:0,behavior:'smooth'});
   };
 });
}

async function deleteChapter(storyId,chapterId){
    const w=get(current),s=w?.stories.find(x=>x.id===storyId);
    if(!s)return;

    const c=s.chapters.find(x=>x.id===chapterId);
    if(!c)return;

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    const user=session?.user;

    if(!user){
        alert('로그인 후 회차를 삭제할 수 있습니다.');
        return;
    }

    if(w.owner_id !== user.id){
        alert('이 세계관의 소유자만 회차를 삭제할 수 있습니다.');
        return;
    }

    if(!confirm(`"${c.name}" 회차를 삭제하시겠습니까?\n삭제하면 되돌릴 수 없습니다.`))return;

    const { error } = await supabaseClient
        .from('chapters')
        .delete()
        .eq('id', chapterId);

    if(error){
        console.error('Supabase 회차 삭제 실패:', error);
        alert('회차 삭제에 실패했습니다.\n' + error.message);
        return;
    }

s.chapters = s.chapters.filter(x => x.id !== chapterId);

renderStorySettings(storyId);
}

let selectedCover='';

function setCoverPreview(src=''){
 selectedCover=src||'';
 const p=$('coverPreview');
 p.innerHTML=src?`<img src="${src}" alt="세계관 대표 사진 미리보기">`:`<span>🖼️</span><small>사진을 선택하면<br>세계관 대표 이미지로 표시됩니다.</small>`;
 $('removeCover').style.display=src?'inline-block':'none';
}

function openModal(id=null){

 if(!currentUserId){
  alert('로그인 후 세계관을 수정하거나 만들 수 있습니다.');
  return;
 }
    
 editId=id;let w=id?get(id):null;
 $('mtitle').textContent=id?'세계관 수정':'새로운 세계관 만들기';
 $('name').value=w?.name||'';$('desc').value=w?.description||'';$('genre').value=['판타지','SF','현대','역사','공포','기타'].includes(w?.genre)?(w?.genre||'판타지'):'기타';$('customGenre').value=(w?.genre&& !['판타지','SF','현대','역사','공포'].includes(w.genre))?w.genre:'';updateCustomGenreField();$('visibility').value=w?.visibility||'public';$('theme').value=w?.theme||'purple';
 $('coverFile').value='';setCoverPreview(w?.coverImage||'');
 $('modal').classList.add('show')
}

$('create').onclick = async () => {

    if(!(await requireLogin())){
        return;
    }

    openModal();
};


$('mobileCreate').onclick = async () => {

    if(!(await requireLogin())){
        return;
    }

    openModal();
};
$('mclose').onclick=$('mcancel').onclick=()=>{$('modal').classList.remove('show');editId=null;selectedCover=''};
$('storyCoverFile').onchange=()=>{const f=$('storyCoverFile').files[0];if(f)processStoryCover(f)};
$('removeStoryCover').onclick=()=>{$('storyCoverFile').value='';setStoryCoverPreview('')};

function cropWorldCoverTo169(file, callback){
    openImageCropModal(file,'worldCover',16/9,callback);
}

$('coverFile').onchange=()=>{
 const file=$('coverFile').files[0]; if(!file)return;
 if(!file.type.startsWith('image/')){alert('이미지 파일만 선택할 수 있습니다.');return;}
 cropWorldCoverTo169(file,src=>{
   selectedCover=src;
   setCoverPreview(selectedCover);
 });
};
$('removeCover').onclick=()=>{$('coverFile').value='';selectedCover='';setCoverPreview('')};
$('msave').onclick = async () => {

    if(!(await requireLogin())) return;

    const name = $('name').value.trim();
    const desc = $('desc').value.trim();

    if(!name || !desc){
        return alert('세계관 이름과 소개를 입력해주세요.');
    }

    const isEdit = !!editId;

    if(isEdit){

        const w = get(editId);

        if(!w) return;

        w.name = name;
        w.description = desc;
        w.genre = getGenreValue();
        w.visibility = $('visibility').value;
        w.theme = $('theme').value;
        w.coverImage = selectedCover || '';

    }else{

        worlds.push({
            id: 'w' + Date.now(),
            name,
            description: desc,
            genre: getGenreValue(),
            visibility: $('visibility').value,
            members: 1,
            icon: '✦',
            theme: $('theme').value,
            coverImage: selectedCover || '',
            joined: true,
            createdAt: Date.now(),

            characters: [],
            locations: [],
            stories: [],
            settings: []
        });
    }

    const success = await save();

    if(!success){
        return;
    }

    $('modal').classList.remove('show');
    editId = null;
    selectedCover = '';

    home();

    alert(isEdit
        ? '세계관이 수정되었습니다!'
        : '세계관이 만들어졌습니다!'
    );
};

function openDelete(id){
    deleteId=id;

    $('deleteText').textContent =
        `"${get(id).name}" 세계관과 그 안의 데이터가 함께 삭제됩니다.`;

    $('deleteModal').classList.add('show');
}

$('dcancel').onclick=()=>{
    $('deleteModal').classList.remove('show');
    deleteId=null;
};

$('dconfirm').onclick=async ()=>{
    if(!deleteId) return;

    const id=deleteId;

    // 화면 데이터에서 먼저 제거
    worlds=worlds.filter(w=>w.id!==id);

    // Supabase에서도 실제 삭제
    const success=await deleteWorldFromSupabase(id);

    if(!success){
        return;
    }

    // 삭제된 세계관이 다시 save()에 포함되지 않도록 현재 목록 유지
    $('deleteModal').classList.remove('show');
    deleteId=null;

    sessionStorage.removeItem('storyboard_current_world');
    sessionStorage.setItem('storyboard_current_tab','overview');

    home();

    alert('세계관이 삭제되었습니다.');
};

async function join(id){
    const { data: { session } } =
        await supabaseClient.auth.getSession();

    const user = session?.user;

    if(!user){
        alert('로그인 후 가입할 수 있습니다.');
        return;
    }

    let w=get(id);

    if(w.visibility==='private'){
        alert('비공개 세계관에는 가입할 수 없습니다.');
        return;
    }

    // 이미 가입되어 있는지 확인
    const { data: existingMember, error: memberCheckError } =
        await supabaseClient
            .from('world_members')
            .select('world_id, user_id, status')
            .eq('world_id', id)
            .eq('user_id', user.id)
            .maybeSingle();

    if(memberCheckError){
        console.error('세계관 가입 상태 확인 실패:', memberCheckError);
        alert('세계관 가입 상태를 확인하지 못했습니다.');
        return;
    }

    // 이미 가입되어 있으면 가입 취소
    if(existingMember){
        const { error } = await supabaseClient
            .from('world_members')
            .delete()
            .eq('world_id', id)
            .eq('user_id', user.id);

        if(error){
            console.error('세계관 가입 취소 실패:', error);
            alert('세계관 가입 취소에 실패했습니다.\n' + error.message);
            return;
        }

        myWorldMemberships =
            myWorldMemberships.filter(
                member =>
                    !(member.world_id === id &&
                      member.user_id === user.id)
            );

        w.joined=false;
        w.members=Math.max(0,w.members-1);

    }else{

        // 세계관 가입
        const { error } = await supabaseClient
            .from('world_members')
            .insert({
                world_id:id,
                user_id:user.id,
                role:'member',
                status:'approved'
            });

        if(error){
            console.error('세계관 가입 실패:', error);
            alert('세계관 가입에 실패했습니다.\n' + error.message);
            return;
        }

        myWorldMemberships.push({
            world_id:id,
            user_id:user.id,
            role:'member',
            status:'approved'
        });

        w.joined=true;
        w.members=(w.members||0)+1;
    }

    current===id
        ? renderWorld()
        : renderHome($('search').value);
}

let selectedCharacterPhoto='';
function setCharacterPhotoPreview(src=''){
 selectedCharacterPhoto=src||'';
 const p=$('characterPhotoPreview');
 p.innerHTML=src?`<img src="${src}" alt="캐릭터 사진 미리보기">`:`<span>🧑‍🎨</span><small>사진을 선택하세요.</small>`;
 $('removeCharacterPhoto').style.display=src?'inline-block':'none';
}

function processCharacterPhoto(file){
    if(!file) return;

    openImageCropModal(file,'character',3/4,result=>{
        setCharacterPhotoPreview(result);
    });
}

$('characterPhoto').onchange=()=>{const f=$('characterPhoto').files[0];if(f)processCharacterPhoto(f)};
$('removeCharacterPhoto').onclick=()=>{$('characterPhoto').value='';setCharacterPhotoPreview('')};
$('genericPhoto').onchange=()=>{const f=$('genericPhoto').files[0];if(f)processGenericPhoto(f)};
$('removeGenericPhoto').onclick=()=>{$('genericPhoto').value='';setGenericPhotoPreview('')};
ensureGenericGroupField();



function ensureCustomCharacterGroupField(){
 const select=$("characterGroup");
 if(!select || $("customCharacterGroupWrap")) return;
 const wrap=document.createElement("div");
 wrap.id="customCharacterGroupWrap";
 wrap.className="custom-input-wrap";
 wrap.innerHTML=`<label>기타 그룹 직접 입력<input id="customCharacterGroup" type="text" maxlength="30" placeholder="예: 오르비스 황실, 정령들"></label>`;
 select.parentElement.insertAdjacentElement("afterend",wrap);
 select.addEventListener("change",()=>{
   wrap.classList.toggle("show",select.value==="기타");
   if(select.value!=="기타") $("customCharacterGroup").value="";
 });
}
function getCharacterGroupValue(){

 return $("characterGroup").value==="기타" ? ($("customCharacterGroup").value.trim() || "기타") : $("characterGroup").value;
}



function openCharacterEdit(id){
 const w=get(current); const c=w?.characters.find(x=>x.id===id);
 if(!c)return;
 editingCharacterId=id; itemType="characters";
 $("ititle").textContent="캐릭터 수정";
 $("iname").value=c.name||""; $("idesc").value=c.description||"";
 $("characterFields").style.display="block";
 ensureCustomCharacterGroupField();
 const standard=["주요 인물","조연","적대 세력","왕족 / 귀족","군대 / 기사단","기타"];
 if(standard.includes(c.group||"주요 인물")){
   $("characterGroup").value=c.group||"주요 인물";
   $("customCharacterGroup").value="";
   $("customCharacterGroupWrap").classList.toggle("show",$("characterGroup").value==="기타");
 }else{
   $("characterGroup").value="기타";
   $("customCharacterGroup").value=c.group||"";
   $("customCharacterGroupWrap").classList.add("show");
 }
 $("characterPhoto").value="";
 setCharacterPhotoPreview(c.photo||"");
 $("itemModal").classList.add("show");
}

async function deleteCharacter(id){

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    const user = session?.user;

if(!user){
    alert('로그인 후 삭제할 수 있습니다.');
    return;
}

const w=get(current);
const c=w?.characters.find(x=>x.id===id);

if(!c)return;

// 세계관 소유자는 모든 캐릭터 삭제 가능
// 그 외에는 본인이 만든 캐릭터만 삭제 가능
if(w.owner_id !== user.id && c.owner_id !== user.id){
    alert('본인이 만든 캐릭터만 삭제할 수 있습니다.');
    return;
}

    // 세계관 소유자는 모든 캐릭터를 관리할 수 있음
    // 가입자는 자신이 만든 캐릭터만 삭제할 수 있음
    if(w.owner_id !== user.id && c.owner_id !== user.id){
        alert('본인이 만든 캐릭터만 삭제할 수 있습니다.');
        return;
    }

    if(!confirm(`"${c.name}" 캐릭터를 삭제하시겠습니까?\n삭제하면 되돌릴 수 없습니다.`)){
        return;
    }

    const { error } = await supabaseClient
        .from('characters')
        .delete()
        .eq('id', id)
        .eq('world_id', current);

    if(error){
        console.error('Supabase 캐릭터 삭제 실패:', error);
        alert('캐릭터 삭제에 실패했습니다.\n' + error.message);
        return;
    }

    w.characters = w.characters.filter(x => x.id !== id);

    renderWorld();
}

function setGenericPhotoPreview(src=''){genericPhoto=src||'';const p=$('genericPhotoPreview');p.innerHTML=src?`<img src="${src}" alt="사진 미리보기">`:`<span>🖼️</span><small>사진을 선택하세요.</small>`;$('removeGenericPhoto').style.display=src?'inline-block':'none';}
function processGenericPhoto(file){
 if(!file) return;
 openImageCropModal(file,'generic',3/4,result=>{
  setGenericPhotoPreview(result);
 });
}
function ensureGenericGroupField(){const s=$('genericGroup');if(!s)return;s.onchange=()=>{$('customGenericGroupWrap').classList.toggle('show',s.value==='기타');if(s.value!=='기타')$('customGenericGroup').value='';};}
function getGenericGroupValue(){return $('genericGroup').value==='기타'?($('customGenericGroup').value.trim()||'기타'):$('genericGroup').value;}
function openGenericEdit(id){const w=get(current),arr=w?.[tab]||[],x=arr.find(v=>v.id===id);if(!x)return;editingGenericId=id;itemType=tab;$('ititle').textContent=tab==='locations'?'지역 수정':'세계관 설정 수정';$('iname').value=x.name||'';$('idesc').value=x.description||'';$('characterFields').style.display='none';$('storyFields').style.display='none';$('genericFields').style.display='block';ensureGenericGroupField();const standard=['기본','주요 지역','도시','국가','特别한 장소','세계관 기본 설정','역사','사회','마법','기술','기타'];$('genericGroup').value=standard.includes(x.group)?x.group:'기타';$('customGenericGroup').value=standard.includes(x.group)?'':(x.group||'');$('customGenericGroupWrap').classList.toggle('show',$('genericGroup').value==='기타');$('genericPhoto').value='';setGenericPhotoPreview(x.photo||'');$('itemModal').classList.add('show');}

async function deleteGeneric(id){

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    const user = session?.user;

    if(!user){
        alert('로그인 후 삭제할 수 있습니다.');
        return;
    }

    const w=get(current);
    const arr=w?.[tab]||[];
    const x=arr.find(v=>v.id===id);
    if(!x)return;

    const typeName=tab==='locations'?'지역':'세계관 설정';
    const table=tab==='locations'?'locations':'world_settings';

    if(!confirm(`"${x.name}" ${typeName}을 삭제하시겠습니까?\n삭제하면 되돌릴 수 없습니다.`))return;

    const {data,error}=await supabaseClient
        .from(table)
        .delete()
        .eq('id',id)
        .eq('world_id',current)
        .select('id');

    if(error){
        console.error(`Supabase ${typeName} 삭제 실패:`,error);
        alert(`${typeName} 삭제에 실패했습니다.\n${error.message}`);
        return;
    }

    if(!data || data.length===0){
        console.error(`Supabase에서 삭제된 ${typeName}을 확인할 수 없습니다:`,id);
        alert(`${typeName} 삭제가 확인되지 않았습니다.\nSupabase의 ${table} 테이블 RLS 권한을 확인해주세요.`);
        return;
    }

    w[tab]=arr.filter(v=>v.id!==id);
    renderWorld();
}

function openItem(type){if(type==='stories'){openStoryModal();return;}editingCharacterId=null;editingGenericId=null;itemType=type;$('ititle').textContent=({characters:'캐릭터',locations:'지역',stories:'소설',settings:'세계관 설정'}[type]||'항목')+' 추가';$('iname').value='';$('idesc').value='';$('characterFields').style.display=type==='characters'?'block':'none';$('genericFields').style.display=(type==='locations'||type==='settings')?'block':'none';$('storyFields').style.display='none';editingStoryId=null;storyCover='';genericPhoto='';if(type==='characters'){ensureCustomCharacterGroupField();$('characterGroup').value='주요 인물';$('customCharacterGroup').value='';$('customCharacterGroupWrap').classList.remove('show');$('characterPhoto').value='';setCharacterPhotoPreview('');}else{ensureGenericGroupField();$('genericGroup').value=type==='locations'?'기본':'세계관 기본 설정';$('customGenericGroup').value='';$('customGenericGroupWrap').classList.remove('show');$('genericPhoto').value='';setGenericPhotoPreview('');}$('itemModal').classList.add('show')}$('iclose').onclick=$('icancel').onclick=()=>{$('itemModal').classList.remove('show');itemType=null;editingCharacterId=null;editingStoryId=null;editingGenericId=null;selectedCharacterPhoto='';storyCover='';genericPhoto=''};$('isave').onclick=async()=>{
 let n=$('iname').value.trim(),d=$('idesc').value.trim();
 if(!n)return alert('이름을 입력해주세요.');
 const w=get(current);
 if(itemType==='stories'){
   const storyName=n,storyDesc=d,storyVisibility=$('storyVisibility').value;
   const storyId=editingStoryId || ('story-'+Date.now()+'-'+Math.random().toString(36).slice(2,7));
   const existing=w.stories.find(x=>x.id===storyId);
   const story=existing || {
     id:storyId,
     name:'',
     description:'',
     visibility:'public',
     coverImage:'',
     chapters:[],
     createdAt:Date.now()
   };

const updatedStory = {
    ...story,
    name: storyName,
    description: storyDesc,
    visibility: storyVisibility,
    coverImage: storyCover || ''
};

const success = await saveStoryToSupabase(updatedStory);
if(!success)return;

Object.assign(story, updatedStory);

   if(!existing)w.stories.push(story);

   $('itemModal').classList.remove('show');
   editingStoryId=null;
   storyCover='';
   itemType=null;
   renderWorld();
   return;
 }

const { data: { session } } =
    await supabaseClient.auth.getSession();

const user = session?.user;

if(!user){
    alert('로그인 후 저장할 수 있습니다.');
    return;
}
    
    if(itemType==='locations'){
    const arr=w.locations;
    const group=getGenericGroupValue();

    const locationId = editingGenericId
        || 'loc-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);

    const locationData = {
        id: locationId,
        world_id: current,
        name: n,
        description: d,
        group_name: group,
        photo: genericPhoto || ''
    };

const { data: { session } } =
    await supabaseClient.auth.getSession();

const user = session?.user;

if(!user){
    alert('로그인 후 저장할 수 있습니다.');
    return;
}

const table = tab === 'locations'
    ? 'locations'
    : 'world_settings';

const {error} = await supabaseClient
    .from(table)
    .upsert(locationData);

if(error){ 
    const typeName = tab === 'locations'
        ? '지역'
        : '세계관 설정';

    console.error(`Supabase ${typeName} 저장 실패:`, error);
    alert(`${typeName} 저장에 실패했습니다.\n` + error.message);
    return; 
}

    if(editingGenericId){
        const x=arr.find(v=>v.id===editingGenericId);

        if(x){
            x.name=n;
            x.description=d;
            x.group=group;
            x.photo=genericPhoto;
        }
    }else{
        arr.push({
            id:locationId,
            name:n,
            description:d,
            group:group,
            photo:genericPhoto || ''
        });
    }

    document.getElementById('itemModal')?.classList.remove('show');

    editingGenericId=null;
    itemType=null;
    genericPhoto='';

    renderWorld();
    return;
}

if(itemType==='settings'){
     const arr=w.settings;
     const group=getGenericGroupValue();

     const settingId=editingGenericId
         || 'set-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);

     const settingData={
         id:settingId,
         world_id:current,
         name:n,
         description:d,
         group_name:group,
         photo:genericPhoto||'',
         created_by: (await supabaseClient.auth.getUser()).data.user?.id || null
     };

     const {error}=await supabaseClient
         .from('world_settings')
         .upsert(settingData);

     if(error){
         console.error('Supabase 세계관 설정 저장 실패:',error);
         alert('세계관 설정 저장에 실패했습니다.\n'+error.message);
         return;
     }

     if(editingGenericId){
         const x=arr.find(v=>v.id===editingGenericId);
         if(x){
             x.name=n;
             x.description=d;
             x.group=group;
             x.photo=genericPhoto||'';
         }
     }else{
         arr.push({
             id:settingId,
             name:n,
             description:d,
             group:group,
             photo:genericPhoto||''
         });
     }

     $('itemModal').classList.remove('show');
     editingGenericId=null;
     itemType=null;
     genericPhoto='';
     renderWorld();
     return;
 }
 if(itemType==='characters'){
  ensureCustomCharacterGroupField();

  const group=getCharacterGroupValue();

  const characterId=editingCharacterId
    || 'char-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);

const { data: { session } } =
    await supabaseClient.auth.getSession();

const user = session?.user;

if(!user){
    alert('로그인 후 캐릭터를 추가하거나 수정할 수 있습니다.');
    return;
}

const world = get(current);

if(!world){
    alert('세계관을 찾을 수 없습니다.');
    return;
}

const isOwner = world.owner_id === user.id;

const isApprovedMember = myWorldMemberships.some(
    member =>
        member.world_id === world.id &&
        member.user_id === user.id &&
        member.status === 'approved'
);

if(!isOwner && !isApprovedMember){
    alert('이 세계관에 가입한 사용자만 캐릭터를 추가할 수 있습니다.');
    return;
}
     
const existingCharacter = editingCharacterId
    ? world.characters.find(x => x.id === editingCharacterId)
    : null;

if(editingCharacterId && existingCharacter){
    if(existingCharacter.owner_id !== user.id){
        alert('본인이 만든 캐릭터만 수정할 수 있습니다.');
        return;
    }
}

if(!user){
    alert('로그인 후 저장할 수 있습니다.');
    return;
}

if(editingCharacterId && existingCharacter){
    if(existingCharacter.owner_id !== user.id){
        alert('본인이 만든 캐릭터만 수정할 수 있습니다.');
        return;
    }
}

const characterData={
    id:characterId,
    world_id:current,
    owner_id:existingCharacter?.owner_id || user.id,
    name:n,
    description:d,
    group_name:group,
    photo:selectedCharacterPhoto || ''
};
     
  const {error}=await supabaseClient
    .from('characters')
    .upsert(characterData);

  if(error){
    console.error('Supabase 캐릭터 저장 실패:',error);
    alert('캐릭터 저장에 실패했습니다.\n'+error.message);
    return;
  }

  if(editingCharacterId){
    const c=w.characters.find(x=>x.id===editingCharacterId);

    if(c){
      c.name=n;
      c.description=d;
      c.group=group;
      c.photo=selectedCharacterPhoto;
        c.owner_id=existingCharacter?.owner_id || user.id;
    }
  }else{
    w.characters.push({
      id:characterId,
      name:n,
      description:d,
      group:group,
      photo:selectedCharacterPhoto||'',
        owner_id:user.id
    });
  }

}else{
  w[itemType].push({name:n,description:d});
}

save();
$('itemModal').classList.remove('show');
editingCharacterId=null;
itemType=null;
selectedCharacterPhoto='';
renderWorld();
};

$('search').oninput=e=>renderHome(e.target.value);document.querySelectorAll('[data-home]').forEach(x=>x.onclick=home);$('logo').onclick=home;document.addEventListener('click',e=>{if(!e.target.closest('.more'))document.querySelectorAll('.menu.show').forEach(x=>x.classList.remove('show'))});document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.modal.show').forEach(x=>x.classList.remove('show'));editId=null;selectedCover=''}});
document.addEventListener("click",function(e){
 const storyChapter=e.target.closest("[data-story-chapters]");
 if(storyChapter){e.stopPropagation();renderStorySettings(storyChapter.dataset.storyChapters);return;}
 const storyEdit=e.target.closest("[data-story-edit]");
 if(storyEdit){e.stopPropagation();openStoryModal(storyEdit.dataset.storyEdit);return;}
 const storyDelete=e.target.closest("[data-story-delete]");
 if(storyDelete){e.stopPropagation();deleteStory(storyDelete.dataset.storyDelete);return;}
 const edit=e.target.closest(".character-edit");
 if(edit){e.stopPropagation();openCharacterEdit(edit.dataset.characterId);return;}
 const del=e.target.closest(".character-delete");
 if(del){e.stopPropagation();deleteCharacter(del.dataset.characterId);return;}
 const ged=e.target.closest("[data-generic-edit]");
    
 if(ged){e.stopPropagation();openGenericEdit(ged.dataset.genericEdit);return;}
 const gdel=e.target.closest("[data-generic-delete]");
 if(gdel){
     e.stopPropagation();
     deleteGeneric(gdel.dataset.genericDelete);
     return;
 }
    
});
$('chapterClose').onclick=$('chapterCancel').onclick=()=>{$('chapterModal').classList.remove('show');editingChapterId=null;chapterStoryId=null};
$('chapterSave').onclick=saveChapter;

document.addEventListener("DOMContentLoaded", function(){
  try {
    if (typeof ensureCustomCharacterGroupField === "function") {
      ensureCustomCharacterGroupField();
    }
    if (typeof updateCustomGenreField === "function") {
      updateCustomGenreField();
    }
    if (typeof ensureGenericGroupField === "function") ensureGenericGroupField();
  } catch (err) {
    console.error("초기화 오류:", err);
  }
});

document.addEventListener("DOMContentLoaded",function(){
 const genre=$("genre");
 if(genre) genre.addEventListener("change",updateCustomGenreField);
});

document.addEventListener('DOMContentLoaded', async () => {

    // 인증 상태 먼저 확인
    const { data } = await supabaseClient.auth.getSession();

    await updateAuthUI(data?.session || null);

    // 그 다음 세계관 데이터 불러오기
    await load();

});


// ==============================
// 공통 이미지 조정 기능
// 세계관 테마 16:9 / 캐릭터·지역·소설·세계관 설정 3:4
// PC 마우스 + 모바일 터치(드래그/핀치 줌) 지원
// ==============================

let imageCropTarget = null;
let imageCropRatio = 1;
let imageCropImage = null;
let imageCropScale = 1;
let imageCropX = 0;
let imageCropY = 0;
let imageCropDragging = false;
let imageCropStartX = 0;
let imageCropStartY = 0;
let imageCropPointers = new Map();
let imageCropLastPinchDistance = 0;
let imageCropCallback = null;

function openImageCropModal(file, target, ratio, callback) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        imageCropTarget = target;
        imageCropRatio = ratio;
        imageCropCallback = typeof callback === 'function' ? callback : null;

        const title = $('imageCropTitle');
        if(title){
            title.textContent = ratio === 16 / 9 ? '세계관 대표 사진 조정' : '사진 조정';
        }

        imageCropImage = new Image();

        imageCropImage.onload = function() {
            imageCropScale = 1;
            imageCropX = 0;
            imageCropY = 0;
            imageCropDragging = false;
            imageCropPointers.clear();
            imageCropLastPinchDistance = 0;

            const zoom = $('imageZoom');
            if (zoom) zoom.value = '1';

            $('imageCropModal')?.classList.add('show');
            drawImageCrop();
        };

        imageCropImage.src = e.target.result;
    };

    reader.readAsDataURL(file);
}

function getCropCanvasSize(){
    const area = $('cropArea');
    const availableWidth = area ? area.clientWidth : 520;
    const isMobile = window.matchMedia && window.matchMedia('(max-width:700px)').matches;
    const maxHeight = isMobile
        ? Math.max(280, Math.min(window.innerHeight * 0.55, window.innerHeight - 260))
        : Math.max(320, Math.min(window.innerHeight * 0.62, 620));

    let width = Math.min(520, availableWidth, maxHeight * imageCropRatio);

    // 아주 작은 화면에서도 조작 영역이 지나치게 작아지지 않도록 합니다.
    width = Math.max(240, width);

    // 3:4 이미지가 세로로 긴 모바일 화면에서 모달 밖으로 튀어나가지 않게 합니다.
    if(width / imageCropRatio > maxHeight){
        width = maxHeight * imageCropRatio;
    }

    return {width, height:width / imageCropRatio};
}

function drawImageCrop() {
    const canvas = $('imageCropCanvas');
    if (!canvas || !imageCropImage) return;

    const ctx = canvas.getContext('2d');
    const size = getCropCanvasSize();
    const width = size.width;
    const height = size.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,width,height);

    const img = imageCropImage;
    const baseScale = Math.max(width / img.width, height / img.height);
    const scale = baseScale * imageCropScale;

    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;

    // 사진이 잘라낼 영역 밖으로 완전히 빠져 빈 공간이 생기지 않도록 위치를 제한합니다.
    const maxOffsetX = Math.max(0,(drawWidth-width)/2);
    const maxOffsetY = Math.max(0,(drawHeight-height)/2);
    imageCropX = Math.max(-maxOffsetX,Math.min(maxOffsetX,imageCropX));
    imageCropY = Math.max(-maxOffsetY,Math.min(maxOffsetY,imageCropY));

    const drawX = (width-drawWidth)/2 + imageCropX;
    const drawY = (height-drawHeight)/2 + imageCropY;

    ctx.drawImage(img,drawX,drawY,drawWidth,drawHeight);
}

function setImageCropScale(value, centerX, centerY){
    const next = Math.max(1,Math.min(3,Number(value)||1));

    // 핀치 줌 시 손가락 사이의 지점을 중심으로 확대/축소
    if(centerX != null && centerY != null && imageCropScale > 0){
        const factor = next / imageCropScale;
        imageCropX = centerX - (centerX - imageCropX) * factor;
        imageCropY = centerY - (centerY - imageCropY) * factor;
    }

    imageCropScale = next;

    const zoom = $('imageZoom');
    if(zoom) zoom.value = String(next);

    drawImageCrop();
}

// 줌 컨트롤
const imageZoom = $('imageZoom');
const imageZoomIn = $('imageZoomIn');
const imageZoomOut = $('imageZoomOut');
const imageCropReset = $('imageCropReset');

if(imageZoom){
    imageZoom.addEventListener('input',function(){
        setImageCropScale(Number(this.value));
    });
}
if(imageZoomIn){
    imageZoomIn.addEventListener('click',function(){
        setImageCropScale(imageCropScale + 0.1);
    });
}
if(imageZoomOut){
    imageZoomOut.addEventListener('click',function(){
        setImageCropScale(imageCropScale - 0.1);
    });
}
if(imageCropReset){
    imageCropReset.addEventListener('click',function(){
        imageCropScale=1;
        imageCropX=0;
        imageCropY=0;
        if(imageZoom) imageZoom.value='1';
        drawImageCrop();
    });
}

// PC 마우스 + 모바일 터치
const imageCropCanvas = $('imageCropCanvas');

function pointerDistance(a,b){
    return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
}

if(imageCropCanvas){
    imageCropCanvas.style.cursor='grab';
    imageCropCanvas.style.touchAction='none';

    imageCropCanvas.addEventListener('pointerdown',function(e){
        if(!imageCropImage) return;

        imageCropPointers.set(e.pointerId,e);
        try{ imageCropCanvas.setPointerCapture(e.pointerId); }catch(err){}

        if(imageCropPointers.size===2){
            const pts=[...imageCropPointers.values()];
            imageCropLastPinchDistance=pointerDistance(pts[0],pts[1]);
            imageCropDragging=false;
        }else{
            imageCropDragging=true;
            imageCropStartX=e.clientX-imageCropX;
            imageCropStartY=e.clientY-imageCropY;
            imageCropCanvas.style.cursor='grabbing';
        }

        e.preventDefault();
    });

    imageCropCanvas.addEventListener('pointermove',function(e){
        if(!imageCropImage) return;

        if(imageCropPointers.has(e.pointerId)){
            imageCropPointers.set(e.pointerId,e);
        }

        if(imageCropPointers.size>=2){
            const pts=[...imageCropPointers.values()].slice(0,2);
            const distance=pointerDistance(pts[0],pts[1]);

            if(imageCropLastPinchDistance>0){
                const rect=imageCropCanvas.getBoundingClientRect();
                const centerX=((pts[0].clientX+pts[1].clientX)/2)-rect.left;
                const centerY=((pts[0].clientY+pts[1].clientY)/2)-rect.top;
                const factor=distance/imageCropLastPinchDistance;
                setImageCropScale(imageCropScale*factor,centerX,centerY);
            }

            imageCropLastPinchDistance=distance;
            imageCropDragging=false;
        }else if(imageCropDragging){
            imageCropX=e.clientX-imageCropStartX;
            imageCropY=e.clientY-imageCropStartY;
            drawImageCrop();
        }

        e.preventDefault();
    });

    function finishCropPointer(e){
        imageCropPointers.delete(e.pointerId);

        if(imageCropPointers.size<2){
            imageCropLastPinchDistance=0;
        }
        if(imageCropPointers.size===0){
            imageCropDragging=false;
            imageCropCanvas.style.cursor='grab';
        }

        try{ imageCropCanvas.releasePointerCapture(e.pointerId); }catch(err){}
        e.preventDefault();
    }

    imageCropCanvas.addEventListener('pointerup',finishCropPointer);
    imageCropCanvas.addEventListener('pointercancel',finishCropPointer);
}

window.addEventListener('resize',()=>{
    if($('imageCropModal')?.classList.contains('show')) drawImageCrop();
});

// 취소 / 적용
const imageCropClose=$('imageCropClose');
const imageCropCancel=$('imageCropCancel');
const imageCropApply=$('imageCropApply');

function closeImageCropModal(){
    $('imageCropModal')?.classList.remove('show');
    imageCropTarget=null;
    imageCropImage=null;
    imageCropDragging=false;
    imageCropPointers.clear();
    imageCropLastPinchDistance=0;
    imageCropCallback=null;
}

if(imageCropClose) imageCropClose.addEventListener('click',closeImageCropModal);
if(imageCropCancel) imageCropCancel.addEventListener('click',closeImageCropModal);

if(imageCropApply){
    imageCropApply.addEventListener('click',function(){
        if(!imageCropImage){
            closeImageCropModal();
            return;
        }

        const canvas=$('imageCropCanvas');
        if(!canvas){
            closeImageCropModal();
            return;
        }

        // 화면용 캔버스(약 520px)를 그대로 저장하면 세계관 테마 이미지가
        // 500px대 저해상도로 저장됩니다. 따라서 적용할 때는 원본을 기준으로
        // 지정된 최종 해상도 캔버스에 다시 그려서 저장합니다.
        const outputSize = imageCropTarget === 'worldCover'
            ? { width: 1280, height: 720 }
            : { width: 600, height: 800 };

        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = outputSize.width;
        outputCanvas.height = outputSize.height;

        const outputCtx = outputCanvas.getContext('2d', { alpha: false });
        const img = imageCropImage;
        const baseScale = Math.max(
            outputSize.width / img.width,
            outputSize.height / img.height
        );
        const scale = baseScale * imageCropScale;

        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;

        // 화면에서 움직인 거리(px)를 최종 해상도에 맞게 비례 확대합니다.
        const displaySize = getCropCanvasSize();
        const offsetScale = outputSize.width / displaySize.width;
        const outputOffsetX = imageCropX * offsetScale;
        const outputOffsetY = imageCropY * offsetScale;

        const maxOffsetX = Math.max(0,(drawWidth-outputSize.width)/2);
        const maxOffsetY = Math.max(0,(drawHeight-outputSize.height)/2);
        const safeOffsetX = Math.max(-maxOffsetX,Math.min(maxOffsetX,outputOffsetX));
        const safeOffsetY = Math.max(-maxOffsetY,Math.min(maxOffsetY,outputOffsetY));

        const drawX = (outputSize.width-drawWidth)/2 + safeOffsetX;
        const drawY = (outputSize.height-drawHeight)/2 + safeOffsetY;

        outputCtx.imageSmoothingEnabled = true;
        outputCtx.imageSmoothingQuality = 'high';
        outputCtx.drawImage(img,drawX,drawY,drawWidth,drawHeight);

        // JPEG 품질을 높여 사진의 디테일과 텍스트 가독성을 최대한 유지합니다.
        const result=outputCanvas.toDataURL('image/jpeg',0.94);

        if(imageCropCallback){
            imageCropCallback(result);
        }

        closeImageCropModal();
    });
}

