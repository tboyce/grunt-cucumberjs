var app = angular.module('report', []);

app.controller('MainCtrl', function($scope, suite) {
  $scope.suite = angular.copy(suite);
});

app.directive('statusLabel', function() {
  return {
   template: '<span ng-if="obj[status] > 0" class="label {{class}}"' +
    'title="{{ status }}">{{ obj[status] }}</span>',
    scope: {
      obj: '=statusLabel',
      status: '@'
    },
    link: function(scope) {
      if (scope.status === 'passed') {
        scope.class = 'label-success';
      } else if (scope.status === 'failed') {
        scope.class = 'label-danger';
      } else if (scope.status === 'undefined' || scope.status === 'notdefined') {
        scope.class = 'label-warning';
      } else if (scope.status === 'skipped') {
        scope.class = 'label-info';
      }
    }
  };
});

app.directive('duration', function() {
   return {
       template: '<small class="text-muted">{{ duration / 1000 / 1000 / 1000 | number:1 }}s</small>',
       scope: {
           duration: "="
       }
   }
});
