# World Platform 앱 설치 안내

이 버전은 **반응형 웹 + PWA(설치형 웹앱)** 구조입니다. 하나의 코드로 Android/iPhone/PC에서 같은 화면과 기능을 사용합니다.

## Android
1. 폴더를 웹 서버(HTTP/HTTPS)에 올립니다.
2. Chrome으로 사이트를 엽니다.
3. 브라우저 메뉴에서 **앱 설치 / 홈 화면에 추가**를 선택합니다.
4. 설치 후 아이콘으로 실행하면 주소창 없이 앱처럼 실행됩니다.

## iPhone/iPad
Safari에서 사이트를 연 뒤 **공유 → 홈 화면에 추가**를 선택합니다.

## Windows PC
Chrome 또는 Edge로 사이트를 연 뒤 주소창의 **설치 아이콘** 또는 메뉴의 **World Platform 설치**를 선택합니다.
설치 후 시작 메뉴/바탕화면에서 앱처럼 실행할 수 있습니다.

## 로컬 PC에서 테스트
`start_world_platform.bat`을 실행하면 로컬 서버가 열립니다.
그 다음 Chrome/Edge에서 설치 기능을 사용할 수 있습니다.

## Android APK에 관하여
현재 폴더는 APK 자체가 아니라 **모든 모바일/PC에서 설치할 수 있는 PWA**입니다.
APK를 Google Play에 올리려면 별도의 Android 서명/빌드 과정이 필요합니다. 현재 웹앱을 그대로 Android WebView/Capacitor 앱으로 감싸면 동일한 UI와 기능을 APK로 패키징할 수 있습니다.

## 데이터
현재 세계관 데이터는 브라우저의 `localStorage`에 저장됩니다. 따라서 PC와 휴대폰 사이에 자동 동기화되지는 않습니다. 기기 간 동기화가 필요하면 이후 서버/로그인 기능을 추가해야 합니다.
