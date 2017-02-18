var gameOptions = {
  width: window.innerWidth * 0.8,
  height: window.innerHeight * 0.7,
  numEnemies: 30,
  padding: 20
};

var gameStats = {
  score: 0,
  bestScore: 0,
  collision: 0
};

var axes = {
  x: d3.scale.linear().domain([0, 100]).range([0, gameOptions.width]),
  y: d3.scale.linear().domain([0, 100]).range([0, gameOptions.height])
};

var gameBoard = d3.select('.board').append('svg:svg')
                  .attr('width', gameOptions.width)
                  .attr('height', gameOptions.height);

var updateScore = function() {
  d3.select('.current span')
    .text(gameStats.score.toString());
};

var updateBestScore = function() {
  gameStats.bestScore = _.max([gameStats.bestScore, gameStats.score]);

  d3.select('.highscore span').text(gameStats.bestScore.toString());
};

var updateCollision = function() {
  d3.select('.collision span').text(gameStats.collision.toString());
};

var Player = function(gameOptions) {
  this.path = 'M44.61,19.19H39l-5.32-8.11L33.59,11c-.05-.05-.05-.11-.11-.16s-.11-.16-.22-.22-.11-.05-.16-.11-.16-.11-.22-.16-.11-.05-.16-.11-.16-.05-.27-.11-10.3-2.79-10.3-2.79a2.24,2.24,0,0,0-1.86.33l-7.95,5.53a2.25,2.25,0,1,0,2.52,3.73L22,12.07l5.7,1.48c-.49.71-13.59,18.85-13.59,18.85l-9.81.82a2.21,2.21,0,0,0-2,2.41,2.26,2.26,0,0,0,2.25,2h.22l10.74-.93A2.15,2.15,0,0,0,17,35.9l5.48-6.63,7.78,5.32L26.09,46a2.18,2.18,0,0,0,1.37,2.85,1.86,1.86,0,0,0,.77.11,2.17,2.17,0,0,0,2.08-1.48L35.18,34a2.22,2.22,0,0,0-.66-2.47l-5.59-4.66,4.6-7.84,2.36,3.56a2.15,2.15,0,0,0,1.86,1h6.85a2.22,2.22,0,0,0,2.25-2.25A2.18,2.18,0,0,0,44.61,19.19ZM37.54,9.66a4.33,4.33,0,1,0-4.33-4.33A4.3,4.3,0,0,0,37.54,9.66Z';
  this.fill = '#ff6600';
  this.x = 0;
  this.y = 0;
  this.angle = 0;
  this.r = 5;
  this.gameOptions = gameOptions;
};

Player.prototype.render = function(to) {
  this.el = to.append('svg:path')
              .attr('d', this.path)
              .attr('fill', this.fill);

  this.transform({
    x: this.gameOptions.width * 0.5,
    y: this.gameOptions.height * 0.5
  });

  this.setupDragging();

  return this;
};

Player.prototype.getX = function() {
  return this.x;
};

Player.prototype.setX = function(x) {
  var minX = this.gameOptions.padding;
  var maxX = this.gameOptions.width - this.gameOptions.padding;

  if (x <= minX) {
    x = minX;
  }

  if (x >= maxX) {
    x = maxX;
  }

  this.x = x;
};

Player.prototype.getY = function() {
  return this.y;
};

Player.prototype.setY = function(y) {
  minY = this.gameOptions.padding;
  maxY = this.gameOptions.height - this.gameOptions.padding;

  if (y <= minY) {
    y = minY;
  }

  if (y >= maxY) {
    y = maxY;
  }

  this.y = y;
};

Player.prototype.transform = function(options) {
  this.angle = this.angle;

  var x = options.x || this.x;
  this.setX(x);

  var y = options.y || this.y;
  this.setY(y);

  this.el.attr('transform', 'rotate(' + this.angle + ',' + this.getX() + ', ' + this.getY() + ') translate(' + this.getX() + ', ' + this.getY() + ')');
};

Player.prototype.moveRelative = function(dx, dy) {
  this.transform({
    x: this.getX() + dx,
    y: this.getY() + dy,
    angle: (360 * (Math.atan2(dy, dx) / (Math.PI * 2)))
  });
};

Player.prototype.setupDragging = function() {
  var dragMove = function() {
    this.moveRelative(d3.event.dx, d3.event.dy);
  };

  dragMove = dragMove.bind(this);

  var drag = d3.behavior.drag().on('drag', dragMove);
  this.el.call(drag);
};

var players = [];
players.push(new Player(gameOptions).render(gameBoard));

var createEnemies = function() {
  return _.range(0, gameOptions.numEnemies)
    .map(function(i) {
      return {
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100
      };
    });
};

var render = function(enemyData) {
  var enemies = gameBoard.selectAll('circle.enemy')
                          .data(enemyData, function(d) {
                            return d.id;
                          });

  enemies.enter()
  .append('svg:circle')
  .attr({
    class: 'enemy',
    cx: function(enemy) {
      return axes.x(enemy.x);
    },
    cy: function(enemy) {
      return axes.y(enemy.y);
    },
    r: 20,
    fill: 'gray'
  });

  enemies.exit().remove();

  var checkCollision = function(enemy, collidedCallback) {

    _(players).each(function(player) {
      var radiusSum = parseFloat(enemy.attr('r')) + player.r;
      var xDiff = parseFloat(enemy.attr('cx')) - player.x;
      var yDiff = parseFloat(enemy.attr('cy')) - player.y;

      var separation = Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2));

      if (separation < radiusSum) {
        collidedCallback(player, enemy);
      }
    });
  };

  var onCollision = function() {
    updateBestScore();
    gameStats.score = 0;
    updateScore();
    gameStats.collision += 1;
    updateCollision();

    if (gameStats.collision % 2 === 0) {
      var mySVG = document.querySelector('svg');
      mySVG.toggleClass('c');
    }
  };

  var tweenWithCollisionDetection = function(endData) {
    var enemy = d3.select(this);
    var startPos = {
      x: parseFloat(enemy.attr('cx')),
      y: parseFloat(enemy.attr('cy'))
    };

    var endPos = {
      x: axes.x(endData.x),
      y: axes.y(endData.y)
    };

    return function(t) {
      checkCollision(enemy, onCollision);

      var enemyNextPos = {
        x: startPos.x + (endPos.x - startPos.x) * t,
        y: startPos.y + (endPos.y - startPos.y) * t
      };

      enemy.attr({
        cx: enemyNextPos.x,
        cy: enemyNextPos.y
      });
    };
  };

  enemies
    .transition()
      .duration(500)
      .attr('r', 20)
    .transition()
      .duration(2000)
      .tween('custom', tweenWithCollisionDetection);
};

var play = function() {
  var gameTurn = function() {
    newEnemyPositions = createEnemies();
    render(newEnemyPositions);
  };

  var increaseScore = function() {
    gameStats.score += 1;
    updateScore();
  };

  gameTurn();

  setInterval(gameTurn, 2000);

  setInterval(increaseScore, 50);
};

play();

SVGElement.prototype.hasClass = function (className) {
  return new RegExp('(\\s|^)' + className + '(\\s|$)').test(this.getAttribute('class'));
};

SVGElement.prototype.addClass = function (className) {
  if (!this.hasClass(className)) {
    this.setAttribute('class', this.getAttribute('class') + ' ' + className);
  }
};

SVGElement.prototype.removeClass = function (className) {
  var removedClass = this.getAttribute('class').replace(new RegExp('(\\s|^)' + className + '(\\s|$)', 'g'), '$2');
  if (this.hasClass(className)) {
    this.setAttribute('class', removedClass);
  }
};

SVGElement.prototype.toggleClass = function (className) {
  if (this.hasClass(className)) {
    this.removeClass(className);
  } else {
    this.addClass(className);
  }
};
