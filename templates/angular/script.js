var app = angular.module('report', ['ui.bootstrap']);

app.controller('MainCtrl', function ($scope, suite, $filter) {
  $scope.suite = angular.copy(suite);

  angular.forEach($scope.suite.features, function (feature) {
    feature.scenarios = $filter('filter')(feature.elements, {'type': 'scenario'});
  });

  $scope.pageChanged = function () {
    var start = ($scope.currentPage - 1) * $scope.itemsPerPage;
    $scope.features = $scope.filteredFeatures.slice(start, start + $scope.itemsPerPage);
  };

  $scope.search = function () {
    var filter = $filter('filter');
    var filtered = filter($scope.suite.features, $scope.criteria);
    $scope.filteredFeatures = filter(filtered, function (feature) {
      return feature.scenarios && feature.scenarios.length > 0;
    });

    $scope.scenarioCriteria = angular.copy($scope.criteria);
    $scope.currentPage = 1;
    $scope.pageChanged();
  };

  $scope.cleanError = function(message) {
    if (!message) return '';
    return message.replace(/(.*(node_modules|node\.js|module\.js).*(\n)?)/g, '');
  };

  $scope.itemsPerPage = 10;
  $scope.search();

});

app.directive('statusLabel', function () {
  return {
    template: '<span ng-if="obj[status] > 0" class="label {{class}}"' +
      'title="{{ status }}">{{ obj[status] }}</span>',
    scope: {
      obj: '=statusLabel',
      status: '@'
    },
    link: function (scope) {
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

app.directive('duration', function () {
  return {
    template: '<small class="text-muted">{{ duration / 1000 / 1000 / 1000 | number:1 }}s</small>',
    scope: {
      duration: "="
    }
  }
});

var showFeatureOrScenario = function () {
  return {
    template: '<b>{{ item.keyword }}:</b>' +
      '<span data-container="body" data-toggle="popover">' +
      '{{ item.name }}' +
      '</span>',
    link: function (scope, element, attrs) {
      if (attrs.feature) {
        scope.item = scope.$eval(attrs.feature);
      } else if (attrs.scenario) {
        scope.item = scope.$eval(attrs.scenario);
      }

      if (scope.item.description) {
        var content = scope.item.description.replace(/\n/g, "<br />");
        $(element.find('span')).popover({trigger: 'hover click', placement: 'bottom', content: content, html: true});
      }
    }
  }
};

app.directive('feature', showFeatureOrScenario);
app.directive('scenario', showFeatureOrScenario);
