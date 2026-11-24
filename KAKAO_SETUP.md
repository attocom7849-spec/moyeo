# 카카오톡 공유 설정

## 카카오 개발자 앱 설정

1. [Kakao Developers](https://developers.kakao.com/)에서 앱을 만듭니다.
2. 앱의 **플랫폼 키 > JavaScript 키** 값을 복사합니다.
3. **플랫폼 > Web**에 배포한 사이트의 도메인을 등록합니다. 카카오 JS SDK는 등록된 도메인에서만 동작합니다.
4. `config.js`의 `kakaoJavaScriptKey`에 JavaScript 키를 입력합니다.
5. `config.js`의 `siteUrl`에 공개된 사이트 주소를 입력합니다. 예: `https://moyeo.example.com`

카카오 JavaScript 키는 브라우저에서 쓰는 공개 키입니다. Admin 키나 REST API 키를 넣지 마세요.

## 실행

파일을 직접 여는 `file://` 주소는 카카오 공유 도메인으로 사용할 수 없습니다. 웹사이트를 HTTPS 호스팅에 배포한 뒤, 등록된 도메인에서 공유 버튼을 사용하세요. 아직 키가 없으면 버튼은 초대 링크 복사로 동작합니다.
