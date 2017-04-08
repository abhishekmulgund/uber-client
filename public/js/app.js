var cabApp = angular.module('cabApp', ['ui.router']);

cabApp.config(function($stateProvider, $urlRouterProvider) {
    
    $urlRouterProvider.otherwise('/index');
    
    $stateProvider
        .state('index', {
            url: '/index',
            templateUrl: "partials/index.html",
            controller: "indexCtrl"
        })
        
});