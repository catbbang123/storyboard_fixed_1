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

    // ==========================================
// 사이트 닉네임 불러오기
// Google 이름/이메일은 공개 닉네임으로 사용하지 않음
// ==========================================
let nickname = '사용자';

const { data: myProfile, error: myProfileError } =
    await supabaseClient
        .from('profiles')
        .select('nickname')
        .eq('user_id', user.id)
        .maybeSingle();

if(myProfileError){
    console.error(
        '내 프로필 불러오기 실패:',
        myProfileError
    );
}else if(myProfile?.nickname){
    nickname = myProfile.nickname;
}

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
    profileName.textContent = nickname;
}

const nicknameInput =
    document.getElementById('nicknameInput');

if(nicknameInput){
    nicknameInput.value =
        nickname === '사용자' ? '' : nickname;
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
let pendingWorldMembers=[];

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
            .select('user_id, nickname, created_at');

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

        profileJoinDates = {};

(profileData || []).forEach(profile => {
    profileJoinDates[profile.user_id] = profile.created_at;
});
    }
    
    if(currentUserId){
        const { data: membershipData, error: membershipError } =
            await supabaseClient
                .from('world_members')
                .select('world_id, user_id, role, status')
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

    const { data: memberCountData, error: memberCountError } =
    await supabaseClient
        .from('world_members')
        .select('world_id, user_id, status');

if(memberCountError){
    console.error('세계관 가입자 수 불러오기 실패:', memberCountError);
}

const memberCountMap = {};

(memberCountData || []).forEach(member => {
    if(member.status !== 'approved') return;

    if(!memberCountMap[member.world_id]){
        memberCountMap[member.world_id] = 0;
    }

    memberCountMap[member.world_id]++;
});

    // 세계관 인원 수를 실제 승인된 가입자 수로 다시 계산합니다.
    // worlds.members에 남아 있는 예전 숫자(기본값 1)를 그대로 사용하지 않습니다.
    if(currentUserId && data?.length){
        const ownedWorldIds = (data || [])
            .filter(w => w.owner_id === currentUserId)
            .map(w => w.id);

        if(ownedWorldIds.length){
            const { data: approvedMemberData, error: approvedMemberError } =
                await supabaseClient
                    .from('world_members')
                    .select('world_id, user_id')
                    .in('world_id', ownedWorldIds)
                    .eq('status', 'approved');

            if(approvedMemberError){
                console.error('세계관 승인 사용자 수 불러오기 실패:', approvedMemberError);
            }else{
                const memberCountMap = {};

                (approvedMemberData || []).forEach(member => {
                    if(!memberCountMap[member.world_id]){
                        memberCountMap[member.world_id] = new Set();
                    }
                    memberCountMap[member.world_id].add(member.user_id);
                });

                (data || []).forEach(world => {
                    if(world.owner_id === currentUserId){
                        // 소유자 1명 + 승인된 가입자 수
                        world.members = 1 + (memberCountMap[world.id]?.size || 0);
                    }
                });
            }
        }
    }
    
    // 내가 소유한 세계관의 가입 대기 요청

    pendingWorldMembers = [];

if(currentUserId){
    const ownedWorldIds = (data || [])
        .filter(w => w.owner_id === currentUserId)
        .map(w => w.id);

    if(ownedWorldIds.length){
        const { data: pendingData, error: pendingError } =
            await supabaseClient
                .from('world_members')
                .select('world_id, user_id, role, status')
                .in('world_id', ownedWorldIds)
                .eq('status', 'pending');

        if(pendingError){
            console.error('가입 대기 요청 불러오기 실패:', pendingError);
        }else{
            pendingWorldMembers = pendingData || [];

            // 가입 신청자의 닉네임 가져오기
            const userIds = pendingWorldMembers.map(m => m.user_id);

            if(userIds.length){
                const { data: profileData, error: profileError } =
                    await supabaseClient
                        .from('profiles')
                        .select('user_id, nickname')
                        .in('user_id', userIds);

                if(profileError){
                    console.error('가입 신청자 닉네임 불러오기 실패:', profileError);
                }else{
                    const nicknameMap = {};

                    (profileData || []).forEach(profile => {
                        nicknameMap[profile.user_id] = profile.nickname;
                    });

// [수정 위치: load() 함수 내 pendingWorldMembers 처리 부분]
if(userIds.length){
    const { data: profileData, error: profileError } =
        await supabaseClient
            .from('profiles')
            .select('user_id, nickname')
            .in('user_id', userIds);

    if(profileError){
        console.error('가입 신청자 닉네임 불러오기 실패:', profileError);
    }else{
        const nicknameMap = {};

        (profileData || []).forEach(profile => {
            if(profile.nickname) {
                nicknameMap[profile.user_id] = profile.nickname;
                profilesCache[profile.user_id] = profile.nickname; // 글로벌 캐시에도 즉시 업데이트
            }
        });

        pendingWorldMembers = pendingWorldMembers.map(member => {
            // DB 조회 결과 -> 프로필 캐시 -> 기본값('익명') 순서로 가져옵니다.
            const userNickname = nicknameMap[member.user_id] 
                || profilesCache[member.user_id] 
                || '익명';

            return {
                ...member,
                nickname: userNickname
            };
        });
    }
}
                }
            }
        }
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
        
        members: (memberCountMap[w.id] || 0) + 1,
        
        icon: w.icon ?? '✦',
        theme: w.theme ?? 'purple',
        coverImage: w.cover_image ?? '',
        joined: myWorldMemberships.some(
            m => m.world_id === w.id && m.status === 'approved'
        ),
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
                photo: l.photo || '',
                created_by: l.created_by || null
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
                created_by: st.created_by || null,
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
                photo: s.photo || '',
                created_by: s.created_by || null
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

function showJoinedWorlds(){
    current = null;

    $('home').classList.remove('hidden');
    $('world').classList.add('hidden');

    const joinedWorlds = worlds.filter(w =>
        myWorldMemberships.some(member =>
            member.world_id === w.id &&
            (member.status === 'approved' || member.status === 'pending')
        )
    );

    $('home').innerHTML = `
        <div class="welcome">
            <small>JOINED WORLDS</small>
            <h1>가입한 세계관</h1>
        </div>

        <div class="grid">
            ${
                joinedWorlds.length
                ? joinedWorlds.map(w => card(w)).join('')
                : `<div class="empty">아직 가입한 세계관이 없습니다.</div>`
            }
        </div>
    `;

    bind();
    requestAnimationFrame(force16x9);
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

const grid = $('grid');
if (grid) {
    grid.innerHTML = list.length
        ? list.map(card).join('')
        : '<div class="empty">🔍<br>검색 결과가 없습니다.</div>';
}

const recent = $('recent');
if (recent) {
    recent.innerHTML = [...visibleWorlds]
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
}

    bind();
    requestAnimationFrame(force16x9);
}

// 세계관 테마/색상에 맞는 평행사변형 아이콘 경로 반환 함수
function getWorldLogoPath(theme) {
const iconMap = {
  white: GITHUB_ICON_BASE_URL + 'white.png',
  red: GITHUB_ICON_BASE_URL + 'red.png',
  orange: GITHUB_ICON_BASE_URL + 'orange.png',
  yellow: GITHUB_ICON_BASE_URL + 'yellow.png',
  green: GITHUB_ICON_BASE_URL + 'green.png',
  sky: GITHUB_ICON_BASE_URL + 'skyblue.png',
  blue: GITHUB_ICON_BASE_URL + 'blue.png',
  purple: GITHUB_ICON_BASE_URL + 'purple.png',
  black: GITHUB_ICON_BASE_URL + 'black.png',
  rainbow: GITHUB_ICON_BASE_URL + 'rainbow.png'
};

  // 기본값은 흰색(white) 아이콘 사용
  return iconMap[theme] || iconMap['white'];
}

// 수정된 card 함수
function card(w) {
  const logoSrc = getUserIconUrl({
    createdAt: profileJoinDates[w.owner_id],
    customIconUrl: w.owner_id === currentUserId
      ? localStorage.getItem("my_custom_icon_path")
      : null
  });

  return `<article class="card" data-id="${w.id}">
<div class="cover ${w.theme} ${w.coverImage ? 'has-photo' : ''}" ${
    w.coverImage ? `style="background-image:url('${w.coverImage}')"` : ''
  }>
  <!-- 왼쪽 상단 평행사변형 로고 추가 -->
  <img src="${logoSrc}" class="world-logo-icon" alt="세계관 로고" />
  ${w.coverImage ? '' : esc(w.icon)}
</div>
<div class="more"><button>⋮</button>
<div class="menu"><button class="edit">✏️ 수정</button><button class="decorate">🎨 꾸미기</button>

<button class="join">${
    w.owner_id === currentUserId
      ? '👑 소유자'
      : w.joined
      ? '🚪 탈퇴'
      : getMembershipStatus(w.id) === 'pending'
      ? '⏳ 승인 대기'
      : '👥 가입하기'
  }</button>
<button class="del">🗑️ 세계관 삭제</button></div></div>
<div class="info"><h3>${esc(w.name)}</h3><p>${esc(w.description)}</p><div class="meta">
<span>👥 ${w.members}명</span><span>${esc(w.genre)}</span><span>${
    w.visibility === 'public' ? '공개' : '비공개'
  }</span></div></div></article>`;
}

function bind(){document.querySelectorAll('[data-open]').forEach(x=>x.onclick=()=>openWorld(x.dataset.open));
                document.querySelectorAll('.card').forEach(c=>{let id=c.dataset.id,m=c.querySelector('.menu');
                c.onclick=e=>{if(!e.target.closest('.more'))openWorld(id)};
                c.querySelector('.more>button').onclick=e=>{e.stopPropagation();
                 document.querySelectorAll('.menu.show').forEach(x=>x.classList.remove('show'));m.classList.add('show')};
                 c.querySelector('.edit').onclick=()=>openModal(id);
                c.querySelector('.decorate').onclick=()=>openModal(id,true);
                c.querySelector('.join').onclick=()=>{
                    const world = get(id);
                
                    if(!world) return;
                
                    if(world.owner_id === currentUserId){
                        return;
                    }
                
                    const membershipStatus = getMembershipStatus(id);
                
                    if(membershipStatus === 'approved'){
                        leaveWorld(id);
                    }else if(membershipStatus === 'pending'){
                        alert('현재 가입 승인 대기 중입니다.');
                    }else{
                        join(id);
                    }
                };
                 c.querySelector('.del').onclick=()=>openDelete(id)})}

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

function getMembershipStatus(worldId){
    const m=myWorldMemberships.find(member=>member.world_id===worldId);
    return m?.status || null;
}

async function refreshWorldMemberCount(worldId){
    const w=get(worldId);
    if(!w) return;

    const { data, error } = await supabaseClient
        .from('world_members')
        .select('user_id')
        .eq('world_id', worldId)
        .eq('status', 'approved');

    if(error){
        console.error('세계관 사용자 수 갱신 실패:', error);
        return;
    }

    // 소유자는 world_members에 없어도 항상 1명으로 포함합니다.
    const uniqueUsers = new Set((data || []).map(m => m.user_id));
    if(w.owner_id) uniqueUsers.add(w.owner_id);
    w.members = uniqueUsers.size || 1;
}

async function loadWorldMembersForManagement(worldId){
    const { data: members, error } = await supabaseClient
        .from('world_members')
        .select('world_id, user_id, role, status')
        .eq('world_id', worldId)
        .order('status', { ascending: true });

    if(error){
        console.error('세계관 가입자 목록 불러오기 실패:', error);
        return [];
    }

    const list = members || [];

    console.log('=== 가입 관리 DB 조회 결과 ===');
    console.log('조회 worldId:', worldId);
    console.log('조회 members:', members);
    
    const userIds = [...new Set(list.map(m => m.user_id).filter(Boolean))];

    let profileMap = {};

    if(userIds.length){
        const { data: profiles, error: profileError } = await supabaseClient
            .from('profiles')
            .select('user_id, nickname, created_at')
            .in('user_id', userIds);

        if(profileError){
            console.error('가입자 프로필 불러오기 실패:', profileError);
        }else{
            (profiles || []).forEach(profile => {
                profileMap[profile.user_id] = profile.nickname || '사용자';
                profilesCache[profile.user_id] = profile.nickname || '사용자';
                if(profile.created_at){
                    profileJoinDates[profile.user_id] = profile.created_at;
                }
            });
        }
    }

    // ★ [핵심 수정 부분] 각 멤버 항목에 닉네임(nickname) 데이터를 명시적으로 매핑하여 반환해야 합니다!
    return list.map(member => ({
        ...member,
        nickname: profileMap[member.user_id] || profilesCache[member.user_id] || '사용자'
    }));
}

async function updateMembershipStatus(worldId,userId,status){
    const w=get(worldId);
    if(!w || w.owner_id!==currentUserId){
        alert('세계관 소유자만 가입 요청을 관리할 수 있습니다.');
        return;
    }

    // 거절은 기존 행을 남기지 않고 삭제합니다.
    // 그래야 같은 사용자가 다시 가입할 때 upsert가 기존 rejected 행을 UPDATE하려고
    // 하지 않고, 새로운 pending 행으로 INSERT할 수 있습니다.
    let error = null;

    if(status === 'rejected'){
        const result = await supabaseClient
            .from('world_members')
            .delete()
            .eq('world_id', worldId)
            .eq('user_id', userId);

        error = result.error;
    }else{
        const result = await supabaseClient
            .from('world_members')
            .update({status})
            .eq('world_id',worldId)
            .eq('user_id',userId);

        error = result.error;
    }

    if(error){
        alert('가입 상태 변경에 실패했습니다.\n'+error.message);
        return;
    }

    pendingWorldMembers=pendingWorldMembers.filter(
        m=>!(m.world_id===worldId && m.user_id===userId)
    );

const existingMembership = myWorldMemberships.find(
    m => m.world_id === worldId && m.user_id === userId
);

if(existingMembership){
    existingMembership.status = status;
}else{
    myWorldMemberships.push({
        world_id: worldId,
        user_id: userId,
        status: status,
        role: 'member'
    });
}
    
    await refreshWorldMemberCount(worldId);
    renderWorld();

    // 관리 창이 열려 있었다면 닫지 않고 최신 가입자 목록으로 갱신합니다.
    setTimeout(()=>openMembershipRequests(worldId),0);
}

async function removeWorldMember(worldId,userId){
    const w=get(worldId);
    if(!w || w.owner_id!==currentUserId){
        alert('세계관 소유자만 가입자를 내보낼 수 있습니다.');
        return;
    }

    if(userId===currentUserId){
        alert('세계관 소유자는 자신을 내보낼 수 없습니다.');
        return;
    }

    const nickname = profilesCache[userId] || '이 사용자';
    const confirmed = confirm(
        `"${nickname}"님을 "${w.name}" 세계관에서 내보내시겠습니까?\n\n내보낸 사용자는 이 세계관에서 탈퇴되며, 다시 참여하려면 가입 신청을 해야 합니다.`
    );

    if(!confirmed) return;

    // 내보내기는 membership 행을 완전히 삭제합니다.
    // 기존 rejected 행이 남아 있으면 재가입 시 upsert가 UPDATE로 처리되어
    // 일반 사용자의 RLS UPDATE 정책에 막힐 수 있습니다.
    const { error } = await supabaseClient
        .from('world_members')
        .delete()
        .eq('world_id', worldId)
        .eq('user_id', userId);

    if(error){
        console.error('세계관 가입자 내보내기 실패:', error);
        alert('사용자를 내보내지 못했습니다.\n' + error.message);
        return;
    }

    const removedMembership = myWorldMemberships.find(
        m => m.world_id === worldId && m.user_id === userId
    );

    if(removedMembership){
        removedMembership.status = 'rejected';
    }

    await refreshWorldMemberCount(worldId);
    renderWorld();

    // 내보낸 뒤에도 관리 창은 유지하고 목록만 새로고침합니다.
    setTimeout(()=>openMembershipRequests(worldId),0);
}

async function openMembershipRequests(worldId){
    const w=get(worldId);
    console.log('가입관리 worldId:', worldId, 'current:', current);
    
    if(!w || w.owner_id!==currentUserId){
        alert('세계관 소유자만 관리할 수 있습니다.');
        return;
    }

   console.log('가입관리 호출 worldId:', worldId);
    
    const members = await loadWorldMembersForManagement(worldId);
    const requests = members.filter(m=>m.status==='pending');
    const approvedMembers = members.filter(m=>m.status==='approved');

    console.log('가입 요청 데이터:', requests);

    let modal=document.getElementById('membershipRequestModal');

    if(!modal){
        modal=document.createElement('div');
        modal.id='membershipRequestModal';
        modal.className='modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML=`
      <div class="modal-box" style="background:#fff;color:#222;width:min(680px,calc(100vw - 32px));max-height:80vh;overflow-y:auto;padding:28px;border-radius:18px;box-sizing:border-box;box-shadow:0 20px 60px rgba(0,0,0,.22);">
        <button class="modal-close" id="membershipRequestClose">×</button>
        <h2 style="margin:0 0 8px;">세계관 가입 관리</h2>
        <p style="margin:0 0 24px;color:#666;"><b>${esc(w.name)}</b></p>

        <h3 style="margin:0 0 12px;">⏳ 가입 요청 <span style="font-size:13px;color:#777;">${requests.length}명</span></h3>
        <div>
          ${requests.length
            ? requests.map(r=>`
              <div style="padding:16px;margin-bottom:10px;border:1px solid #e5e5e5;border-radius:12px;background:#fafafa;">
                <b>
                    <img
                        src="${getUserIconUrl({
                            createdAt: profileJoinDates[r.user_id]
                        })}"
                        class="dynamic-author-icon"
                        alt="사용자 아이콘"
                    >
                    ${esc(r.nickname)}
                </b>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
                  <button data-approve="${r.user_id}">승인</button>
                  <button data-pending="${r.user_id}">대기</button>
                  <button data-reject="${r.user_id}">거절</button>
                </div>
              </div>`).join('')
            : '<p style="padding:12px 0;color:#777;">가입 승인 대기 중인 사용자가 없습니다.</p>'}
        </div>

        <div style="height:1px;background:#eee;margin:24px 0;"></div>

        <h3 style="margin:0 0 12px;">✅ 가입한 사용자 <span style="font-size:13px;color:#777;">${approvedMembers.length}명</span></h3>
        <div>
          ${approvedMembers.length
            ? approvedMembers.map(m=>`
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px;margin-bottom:10px;border:1px solid #e5e5e5;border-radius:12px;background:#fff;">
                <div>
                    <b>
                        <img
                            src="${getUserIconUrl({
                                createdAt: profileJoinDates[m.user_id]
                            })}"
                            class="dynamic-author-icon"
                            alt="사용자 아이콘"
                        >
                        ${esc(m.nickname)}
                    </b>
                    <div style="font-size:12px;color:#888;margin-top:4px;">가입 승인된 사용자</div>
                </div>
                
                <button data-remove-member="${m.user_id}" style="flex-shrink:0;">🚪 내보내기</button>
              </div>`).join('')
            : '<p style="padding:12px 0;color:#777;">아직 가입 승인된 사용자가 없습니다.</p>'}
        </div>
      </div>`;

    modal.classList.add('show');
    modal.querySelector('#membershipRequestClose').onclick=()=>{
        modal.classList.remove('show');
    };

    console.log('가입 관리에서 받은 members:', members);
    console.log('최종 가입 요청:', requests);
    console.log('최종 가입 요청 수:', requests.length);

    modal.querySelectorAll('[data-approve]').forEach(b=>{
        b.onclick=()=>updateMembershipStatus(worldId,b.dataset.approve,'approved');
    });

    modal.querySelectorAll('[data-reject]').forEach(b=>{
        b.onclick=()=>updateMembershipStatus(worldId,b.dataset.reject,'rejected');
    });

    modal.querySelectorAll('[data-pending]').forEach(b=>{
        b.onclick=()=>openMembershipRequests(worldId);
    });

    modal.querySelectorAll('[data-remove-member]').forEach(b=>{
        b.onclick=()=>removeWorldMember(worldId,b.dataset.removeMember);
    });
}

function renderWorld(){
    let w=get(current);
    const isOwner = w.owner_id === currentUserId;
    const membershipStatus = getMembershipStatus(w.id);
    const isApprovedMember = membershipStatus === 'approved';
    const isPendingMember = membershipStatus === 'pending';
    
    $('home').classList.add('hidden');
    $('world').classList.remove('hidden');let tabs=[['overview','개요'],['characters','캐릭터'],['locations','지역'],['stories','소설'],['settings','세계관 설정']];let body;if(tab==='overview')body=`
<div class="join">
  <span>
    <b>${
      isOwner ? '내가 소유한 세계관입니다.' :
      isApprovedMember ? '가입 승인된 세계관입니다.' :
      isPendingMember ? '가입 승인 대기 중입니다.' :
      membershipStatus==='rejected' ? '가입이 거절되었습니다.' :
      '이 세계관에 참여해보세요.'
    }</b>
    <br><small>${w.members}명이 함께하고 있습니다.</small>
  </span>
  ${
    isOwner
      ? '<button id="manageMembers">👥 가입 요청 관리</button>'
      : isPendingMember
        ? '<button id="pageJoin" disabled>⏳ 승인 대기 중</button>'
        : isApprovedMember
          ? '<button id="pageJoin">🚪 세계관 탈퇴</button>'
          : '<button id="pageJoin">'+(membershipStatus==='rejected'?'가입 재요청':'세계관 가입')+'</button>'
  }
</div>
${isPendingMember ? '<div style="margin:16px 0;padding:14px;border:1px solid #ddd;border-radius:12px">⏳ 승인 대기 중입니다.<br><small>승인 전에도 캐릭터, 지역, 세계관 설정, 소설을 볼 수 있습니다.</small></div>' : ''}
<h2>세계관 소개</h2><p>${esc(w.description)}</p>`;
else body=section(w);$('world').innerHTML=`<div class="hero ${w.theme} ${w.coverImage?'has-photo':''}" ${w.coverImage?`style="background-image:url('${w.coverImage}')"`:''}><button class="back" id="back">← 목록</button><div class="actions"><button id="editPage">✏️ 수정</button><button id="decoratePage">🎨 꾸미기</button></div><div><h1>${esc(w.name)}</h1><p>${esc(w.description)}</p></div></div><div class="tabs">${tabs.map(t=>`<button class="${tab===t[0]?'active':''}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div><div class="content">${body}</div>`;$('back').onclick=home;
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
if($('manageMembers'))$('manageMembers').onclick=()=>openMembershipRequests(w.id);
if($('pageJoin'))$('pageJoin').onclick=()=>{ if(isApprovedMember) leaveWorld(w.id); else if(!isPendingMember) join(w.id); };
requestAnimationFrame(force16x9)}

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
<small class="author-name">
    <img
        src="${getUserIconUrl({
            createdAt: profileJoinDates[s.created_by]
        })}"
        class="dynamic-author-icon"
        alt="사용자 아이콘"
    >
    ${esc(profilesCache[s.created_by] || '사용자')}
</small>
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
    <img
        src="${getUserIconUrl({
            createdAt: profileJoinDates[c.owner_id]
        })}"
        class="dynamic-author-icon"
        alt="사용자 아이콘"
    >
    ${esc(profilesCache[c.owner_id] || '사용자')}
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
                                <small class="author-name">
                                    <img
                                        src="${getUserIconUrl({
                                            createdAt: profileJoinDates[x.created_by]
                                        })}"
                                        class="dynamic-author-icon"
                                        alt="사용자 아이콘"
                                    >
                                    ${esc(profilesCache[x.created_by] || '사용자')}
                                </small>
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
        created_by:story.created_by || currentUserId || null,
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

// [수정: 가입/재가입 신청 함수 - 거절/내보내기 후 재가입 지원]

async function join(worldId) {
    if(!currentUserId){
        alert('로그인 후 가입 신청할 수 있습니다.');
        return;
    }

    const { data: myProfile } = await supabaseClient
        .from('profiles')
        .select('nickname')
        .eq('user_id', currentUserId)
        .maybeSingle();

    const myNickname =
        myProfile?.nickname ||
        profilesCache[currentUserId] ||
        '익명';

    // 현재 가입 상태 확인
    const { data: existingMembership, error: existingError } =
        await supabaseClient
            .from('world_members')
            .select('world_id, user_id, status, role')
            .eq('world_id', worldId)
            .eq('user_id', currentUserId)
            .maybeSingle();

    if(existingError){
        console.error('기존 가입 상태 확인 실패:', existingError);
        alert(
            '가입 상태를 확인하지 못했습니다.\n' +
            existingError.message
        );
        return;
    }

    let result;

    // 이미 가입 기록이 있는 경우
    if(existingMembership){

        // 이미 승인됨
        if(existingMembership.status === 'approved'){
            alert('이미 가입된 세계관입니다.');
            return;
        }

        // 이미 대기 중
        if(existingMembership.status === 'pending'){
            alert('이미 가입 승인 대기 중입니다.');

            await load();
            renderWorld();
            return;
        }

        // 거절된 가입을 다시 신청
        if(existingMembership.status === 'rejected'){
            result = await supabaseClient
                .from('world_members')
                .update({
                    status: 'pending',
                    role: 'member'
                })
                .eq('world_id', worldId)
                .eq('user_id', currentUserId)
                .eq('status', 'rejected')
                .select()
                .single();
        }

    }else{

        // 처음 가입 신청
        result = await supabaseClient
            .from('world_members')
            .insert({
                world_id: worldId,
                user_id: currentUserId,
                status: 'pending',
                role: 'member'
            })
            .select()
            .single();
    }

    if(result?.error){
        console.error('가입 신청 실패:', result.error);

        alert(
            '가입 신청에 실패했습니다.\n' +
            result.error.message
        );

        return;
    }

    console.log('가입 신청 완료:', result?.data);

    profilesCache[currentUserId] = myNickname;

    alert('가입 신청이 완료되었습니다.');

    // 서버의 실제 상태를 다시 불러오기
    await load();

    // 현재 세계관 화면 다시 표시
    renderWorld();

    // 실제로 pending 상태가 되었는지 확인
    const newStatus = getMembershipStatus(worldId);

    console.log(
        '재가입 후 상태:',
        worldId,
        currentUserId,
        newStatus
    );
}

async function leaveWorld(id){
    const { data: { session } } =
        await supabaseClient.auth.getSession();

    const user = session?.user;

    if(!user){
        alert('로그인 후 탈퇴할 수 있습니다.');
        return;
    }

    const w = get(id);

    if(!w) return;

    if(w.owner_id === user.id){
        alert('세계관 소유자는 자신의 세계관에서 탈퇴할 수 없습니다.');
        return;
    }

    const confirmed = confirm(
        `"${w.name}" 세계관에서 탈퇴하시겠습니까?\n탈퇴하면 다시 가입 신청해야 합니다.`
    );

    if(!confirmed) return;

    const { error } = await supabaseClient
        .from('world_members')
        .delete()
        .eq('world_id', id)
        .eq('user_id', user.id);

    if(error){
        console.error('세계관 탈퇴 실패:', error);
        alert('세계관 탈퇴에 실패했습니다.\n' + error.message);
        return;
    }

myWorldMemberships = myWorldMemberships.filter(
    m => !(m.world_id === id && m.user_id === user.id)
);

await refreshWorldMemberCount(id);

const world = get(id);

if(world){
    world.joined = false;
}

alert('세계관에서 탈퇴했습니다.');

renderWorld();
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
     created_by:currentUserId || null,
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
    photo: genericPhoto || '',
    created_by: user.id
};

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
            photo:genericPhoto || '',
            created_by:user.id
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
         created_by: user.id
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
     }
     
     else{
         arr.push({
             id:settingId,
             name:n,
             description:d,
             group:group,
             photo:genericPhoto||'',
             created_by:user.id
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

$('search').oninput=e=>renderHome(e.target.value);

function showMyCreation(){
    current = null;

    $('home').classList.add('hidden');
    $('world').classList.add('hidden');
    $('my-creation').classList.remove('hidden');
}

document.querySelectorAll('[data-home]').forEach(x=>x.onclick=home);
document.querySelectorAll('[data-my-creation]').forEach(x=>x.onclick=showMyCreation);
$('logo').onclick=home;

document.querySelectorAll('[data-joined-worlds]').forEach(btn => {
    btn.onclick = () => {
        showJoinedWorlds();
    };
});

document.addEventListener('click',e=>{if(!e.target.closest('.more'))document.querySelectorAll('.menu.show').forEach(x=>x.classList.remove('show'))});document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.modal.show').forEach(x=>x.classList.remove('show'));editId=null;selectedCover=''}});
document.addEventListener("click",function(e){
  const addButton=e.target.closest("#add");
  if(addButton){
    e.preventDefault();
    e.stopPropagation();
    if(typeof openItem === "function"){
      openItem(tab);
    }
    return;
  }
});
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

// ==========================================
// 닉네임 저장
// ==========================================
document.addEventListener('DOMContentLoaded', function(){

    const saveNicknameBtn =
        document.getElementById('saveNicknameBtn');

    if(!saveNicknameBtn) return;

    saveNicknameBtn.addEventListener('click', async function(){

        const { data: userData, error: userError } =
            await supabaseClient.auth.getUser();

        if(userError || !userData?.user){

            alert('로그인 상태를 확인하지 못했습니다.');
            return;

        }

        const user = userData.user;

        const nicknameInput =
            document.getElementById('nicknameInput');

        const nickname =
            nicknameInput?.value.trim() || '';

        if(!nickname){

            alert('닉네임을 입력해주세요.');
            nicknameInput?.focus();

            return;
        }

        if(nickname.length > 20){

            alert('닉네임은 20자 이하로 입력해주세요.');
            return;
        }

const { data: existingProfile, error: profileCheckError } =
    await supabaseClient
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

if(profileCheckError){
    console.error('프로필 확인 실패:', profileCheckError);
    alert('프로필을 확인하지 못했습니다.\n' + profileCheckError.message);
    return;
}

let saveError = null;

if(existingProfile){
    // 기존 프로필이 있으면 닉네임 변경
    const { error } = await supabaseClient
        .from('profiles')
        .update({
            nickname: nickname
        })
        .eq('user_id', user.id);

    saveError = error;
}else{
    // 새 계정이라 프로필이 없으면 새로 생성
    const { error } = await supabaseClient
        .from('profiles')
        .insert({
            user_id: user.id,
            nickname: nickname
        });

    saveError = error;
}

if(saveError){
    console.error('닉네임 저장 실패:', saveError);

    alert(
        '닉네임 저장에 실패했습니다.\n' +
        saveError.message
    );

    return;
}

        // 현재 사용자의 닉네임 캐시도 즉시 변경
        profilesCache[user.id] = nickname;

        // 프로필 메뉴 이름 변경
        const profileName =
            document.getElementById('profileName');

        if(profileName){
            profileName.textContent = nickname;
        }

        alert('닉네임이 저장되었습니다.');

    });

});

/**
 * 사용자 가입 기간(개월 수) 기반 아이콘 자동 변경 및 사용자 지정 아이콘 설정 스크립트
 */

// 아이콘 기본 GitHub raw 링크 경로
const GITHUB_ICON_BASE_URL = "https://raw.githubusercontent.com/catbbang123/storyboard_fixed_1/main/icons/";

// 가입 기간별 아이콘 파일 목록
// 0개월: 흰색, 1개월: 빨강, 2개월: 주황, 3개월: 노랑, 4개월: 초록,
// 5개월: 하늘색, 6개월: 파랑, 7개월: 보라, 8개월: 검은색, 9개월 이상: 무지개 색상
const PERIOD_ICONS = [
    "white.png",    // 0개월차 (가입 직후)
    "red.png",      // 1개월 경과
    "orange.png",   // 2개월 경과
    "yellow.png",   // 3개월 경과
    "green.png",    // 4개월 경과
    "skyblue.png",  // 5개월 경과
    "blue.png",     // 6개월 경과
    "purple.png",   // 7개월 경과
    "black.png",    // 8개월 경과
    "rainbow.png"   // 9개월 이상 (10개월차~)
];

/**
 * 가입 날짜를 기준으로 현재까지 경과한 개월 수를 계산합니다.
 */
function calculateMonthsSinceSignup(createdAt) {
    const signupDate = new Date(createdAt);
    const now = new Date();
    
    let months = (now.getFullYear() - signupDate.getFullYear()) * 12 + (now.getMonth() - signupDate.getMonth());
    
    // 일자 비교: 가입일보다 현재 날짜의 일이 더 작으면 1개월 미만 경과로 처리
    if (now.getDate() < signupDate.getDate()) {
        months--;
    }
    
    return months < 0 ? 0 : months;
}

/**
 * 경과 개월 수에 따른 아이콘 파일명을 반환합니다.
 */
function getIconFileNameByPeriod(months) {
    if (months >= 9) {
        return PERIOD_ICONS[9]; // 9개월 이상(10개월차부터)은 무지개 색상 유지
    }
    return PERIOD_ICONS[months] || PERIOD_ICONS[0];
}

/**
 * 사용자 닉네임 또는 정보 영역에 표시될 아이콘 URL을 가져옵니다.
 */
function getUserIconUrl(user) {
    if (!user || !user.createdAt) {
        return GITHUB_ICON_BASE_URL + PERIOD_ICONS[0]; // 기본 0개월차 아이콘
    }

    const monthsPassed = calculateMonthsSinceSignup(user.createdAt);
    
    // 가입 10개월차 이상(경과 개월 수 9 이상)이고 사용자가 원하는 사진을 설정한 경우 우선 적용
    if (monthsPassed >= 9 && user.customIconUrl) {
        return user.customIconUrl;
    }
    
    const iconFileName = getIconFileNameByPeriod(monthsPassed);
    return GITHUB_ICON_BASE_URL + iconFileName;
}

/**
 * DOM 전체를 탐색하며 👤 이모지나 인원수 영역을 평행사변형 아이콘으로 대체하는 함수
 */

async function applyPersonalMonthlyIcons() {
    const { data: { user: supabaseUser } } = await supabaseClient.auth.getUser();

    if (!supabaseUser) return;

    // Supabase 실제 가입일 사용
    const joinDate = supabaseUser.created_at;

    // 기존 localStorage에도 실제 가입일을 저장
    localStorage.setItem("my_platform_join_date", joinDate);

    const user = {
        nickname: localStorage.getItem("my_platform_nickname") || "창작자",
        createdAt: joinDate,
        customIconUrl: localStorage.getItem("my_custom_icon_path")
    };

    const monthsPassed = calculateMonthsSinceSignup(user.createdAt);
    const iconUrl = getUserIconUrl(user);

    // 오직 9개월 이상이거나 커스텀 아이콘을 등록한 경우에만 변경 권한
    const hasCustomIcon = Boolean(localStorage.getItem("my_custom_icon_path"));
    const isRainbowPeriod = monthsPassed >= 9;
    const canChangeIcon = isRainbowPeriod || hasCustomIcon;

    const profileAvatar = document.querySelector("#profileAvatar");

if (profileAvatar) {
    profileAvatar.innerHTML = "";

    const avatarImg = document.createElement("img");
    avatarImg.src = iconUrl;
    avatarImg.alt = "프로필 아이콘";
    avatarImg.className = "dynamic-profile-user-icon";

    avatarImg.style.width = "32px";
    avatarImg.style.height = "32px";
    avatarImg.style.objectFit = "contain";
    avatarImg.style.display = "block";

    if (canChangeIcon) {
        avatarImg.style.cursor = "pointer";
        avatarImg.title = "아이콘 변경";

        avatarImg.onclick = (e) => {
            e.stopPropagation();
            openIconChangeModal();
        };
    }

    profileAvatar.appendChild(avatarImg);
}

document.querySelectorAll(".author-name").forEach(el => {
    const text = el.textContent.trim();

    if (!text.includes("👤")) return;

    el.innerHTML = "";

    const iconImg = document.createElement("img");
    iconImg.src = iconUrl;
    iconImg.alt = "사용자 아이콘";
    iconImg.className = "dynamic-author-icon";

    iconImg.style.width = "13px";
    iconImg.style.height = "13px";
    iconImg.style.marginRight = "4px";
    iconImg.style.verticalAlign = "middle";
    iconImg.style.objectFit = "contain";

    if (canChangeIcon) {
        iconImg.style.cursor = "pointer";
        iconImg.title = "아이콘 변경";

        iconImg.onclick = (e) => {
            e.stopPropagation();
            openIconChangeModal();
        };
    }

    el.appendChild(iconImg);

    const name = text.replace("👤", "").trim();
    el.append(` ${name}`);
});

    document.querySelectorAll("*").forEach(el => {
        // 로그인 버튼이나 프로필 메뉴 등 예외 처리 영역 제외
        if (
            el.closest("#googleLoginBtn") ||
            el.closest("#profileMenu") ||
            el.id === "profileName"
        ) {
            return;
        }

        if (el.children.length === 0 && el.textContent) {
            const text = el.textContent.trim();
            const hasUserEmoji = text.includes("👤");
            const isMemberCount = text.endsWith("명") && !text.includes("아이콘");

            if (hasUserEmoji || isMemberCount) {
                if (
                    el.dataset.iconApplied === "true" &&
                    el.dataset.currentSrc === iconUrl
                ) {
                    return;
                }

                el.innerHTML = "";

                const iconImg = document.createElement("img");
                iconImg.src = iconUrl;
                iconImg.className = "dynamic-user-icon";
                iconImg.style.width = "13px";
                iconImg.style.height = "13px";
                iconImg.style.marginRight = "4px";
                iconImg.style.verticalAlign = "middle";
                iconImg.style.objectFit = "contain";

                // 9개월 이상 또는 커스텀 아이콘 등록 시 변경 가능
                if (canChangeIcon) {
                    iconImg.style.cursor = "pointer";
                    iconImg.title = `클릭하여 500x500 아이콘 변경하기 (활동 경과: ${monthsPassed}개월)`;

                    iconImg.onclick = (e) => {
                        e.stopPropagation();
                        openIconChangeModal();
                    };
                } else {
                    iconImg.style.cursor = "default";
                    iconImg.title = `활동 경과: ${monthsPassed}개월 차 (9개월 차 무지개 아이콘부터 변경 권한이 주어집니다!)`;
                }

                el.appendChild(iconImg);
                el.append(` ${text.replace("👤", "").trim()}`);

                el.dataset.iconApplied = "true";
                el.dataset.currentSrc = iconUrl;
            }
        }
    });
}

/**
 * 500x500 아이콘 변경 전용 모달 창 생성 및 열기 함수
 */
function openIconChangeModal() {
    let existingModal = document.getElementById("iconChangeModal");
    if (existingModal) existingModal.remove();

    const modalHTML = `
        <div id="iconChangeModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 9999;">
            <div style="background: white; padding: 25px; border-radius: 12px; width: 350px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                <h3 style="margin-top: 0; color: #333; font-size: 18px;">✨ 나만의 아이콘 변경</h3>
                <p style="font-size: 13px; color: #666; margin-bottom: 15px;">500 x 500 px 규격의 이미지를 업로드해 주세요.</p>
                
                <input type="file" id="iconFileInput" accept="image/*" style="margin-bottom: 15px; width: 100%; font-size: 12px;">
                
                <div style="margin-bottom: 15px;">
                    <img id="iconPreview" src="" style="width: 80px; height: 80px; object-fit: contain; border: 1px dashed #ccc; border-radius: 8px; display: none; margin: 0 auto;" alt="미리보기">
                </div>

                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="saveIconButton" style="background: #6c5ce7; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">저장하기</button>
                    <button id="closeIconButton" style="background: #b2bec3; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">닫기</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    const fileInput = document.getElementById("iconFileInput");
    const previewImg = document.getElementById("iconPreview");
    let base64Image = "";

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
                base64Image = uploadEvent.target.result;
                previewImg.src = base64Image;
                previewImg.style.display = "block";
            };
            reader.readAsDataURL(file);
        }
    };

    document.getElementById("saveIconButton").onclick = () => {
        if (!base64Image) {
            alert("변경할 이미지를 선택해 주세요!");
            return;
        }
        localStorage.setItem("my_custom_icon_path", base64Image);
        alert("아이콘이 성공적으로 변경되었습니다!");
        document.getElementById("iconChangeModal").remove();
        applyPersonalMonthlyIcons();
    };

    document.getElementById("closeIconButton").onclick = () => {
        document.getElementById("iconChangeModal").remove();
    };
}

// 페이지 로드 시 실행 및 주기적 렌더링
document.addEventListener("DOMContentLoaded", () => {
    applyPersonalMonthlyIcons();
});

// 테스트용 함수 (브라우저 콘솔창에 window.testMonthsLater(0) ~ window.testMonthsLater(9) 입력 가능)
window.testMonthsLater = async function(months) {
    const { data: { user: supabaseUser } } = await supabaseClient.auth.getUser();

    if (!supabaseUser) {
        console.log("[테스트 실패] 로그인된 사용자가 없습니다.");
        return;
    }

    const realJoinDate = new Date(supabaseUser.created_at);
    const fakeJoinDate = new Date(realJoinDate);
    fakeJoinDate.setMonth(fakeJoinDate.getMonth() - months);

    localStorage.setItem("my_platform_join_date", fakeJoinDate.toISOString());

    // 테스트 시 일반 기간으로 내리면 커스텀 아이콘 경로도 임시로 초기화
    if (months < 9) {
        localStorage.removeItem("my_custom_icon_path");
    }

    await applyPersonalMonthlyIcons();

    console.log(
        `[테스트 완료] 실제 가입일: ${supabaseUser.created_at} / 테스트: 가입 ${months}개월 차 / 모달 권한: ${months >= 9}`
    );
};
