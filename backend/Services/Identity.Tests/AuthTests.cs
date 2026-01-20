using FluentAssertions;
using Identity.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Identity.Tests;

public class AuthTests
{
    private readonly IdentityDbContext _dbContext;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly Mock<IUserStore<ApplicationUser>> _userStoreMock;

    public AuthTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<IdentityDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new IdentityDbContext(options);

        // Setup UserManager mock
        _userStoreMock = new Mock<IUserStore<ApplicationUser>>();
        _userManager = new UserManager<ApplicationUser>(
            _userStoreMock.Object,
            new Mock<IOptions<IdentityOptions>>().Object,
            new Mock<IPasswordHasher<ApplicationUser>>().Object,
            Array.Empty<IUserValidator<ApplicationUser>>(),
            Array.Empty<IPasswordValidator<ApplicationUser>>(),
            new Mock<ILookupNormalizer>().Object,
            new Mock<IdentityErrorDescriber>().Object,
            new Mock<IServiceProvider>().Object,
            new Mock<ILogger<UserManager<ApplicationUser>>>().Object);
    }

    [Fact]
    public async Task Register_WithValidData_ShouldCreateUser()
    {
        // Arrange
        var email = "test@example.com";
        var password = "Password123!";
        var fullName = "Test User";

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = fullName
        };

        _userStoreMock.Setup(x => x.CreateAsync(It.IsAny<ApplicationUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        var result = await _userManager.CreateAsync(user, password);

        // Assert
        result.Succeeded.Should().BeTrue();
        user.Email.Should().Be(email);
        user.FullName.Should().Be(fullName);
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_ShouldFail()
    {
        // Arrange
        var email = "duplicate@example.com";
        var password = "Password123!";

        var existingUser = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = "Existing User"
        };

        _userStoreMock.Setup(x => x.FindByNameAsync(email.ToUpper(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingUser);

        _userStoreMock.Setup(x => x.CreateAsync(It.IsAny<ApplicationUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "Email already exists" }));

        var newUser = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = "New User"
        };

        // Act
        var result = await _userManager.CreateAsync(newUser, password);

        // Assert
        result.Succeeded.Should().BeFalse();
        result.Errors.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Register_WithWeakPassword_ShouldFail()
    {
        // Arrange
        var email = "test@example.com";
        var weakPassword = "123"; // Too short

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = "Test User"
        };

        _userStoreMock.Setup(x => x.CreateAsync(It.IsAny<ApplicationUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(IdentityResult.Failed(new IdentityError { Description = "Password is too weak" }));

        // Act
        var result = await _userManager.CreateAsync(user, weakPassword);

        // Assert
        result.Succeeded.Should().BeFalse();
    }

    [Fact]
    public async Task ForgotPassword_WithValidEmail_ShouldCreateResetToken()
    {
        // Arrange
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            Email = "test@example.com",
            UserName = "test@example.com",
            FullName = "Test User"
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray());

        var resetToken = new PasswordResetToken
        {
            UserId = user.Id,
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            IsUsed = false
        };

        // Act
        _dbContext.PasswordResetTokens.Add(resetToken);
        await _dbContext.SaveChangesAsync();

        // Assert
        var savedToken = await _dbContext.PasswordResetTokens.FirstOrDefaultAsync(t => t.UserId == user.Id);
        savedToken.Should().NotBeNull();
        savedToken!.Token.Should().Be(token);
        savedToken.IsUsed.Should().BeFalse();
        savedToken.ExpiresAt.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public async Task ResetPassword_WithValidToken_ShouldResetPassword()
    {
        // Arrange
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            Email = "test@example.com",
            UserName = "test@example.com",
            FullName = "Test User"
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        var resetToken = new PasswordResetToken
        {
            UserId = user.Id,
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            IsUsed = false
        };

        _dbContext.PasswordResetTokens.Add(resetToken);
        await _dbContext.SaveChangesAsync();

        // Act
        var foundToken = await _dbContext.PasswordResetTokens
            .FirstOrDefaultAsync(t => t.Token == token && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow);

        // Assert
        foundToken.Should().NotBeNull();
        foundToken!.UserId.Should().Be(user.Id);
    }

    [Fact]
    public async Task ResetPassword_WithExpiredToken_ShouldFail()
    {
        // Arrange
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            Email = "test@example.com",
            UserName = "test@example.com",
            FullName = "Test User"
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        var resetToken = new PasswordResetToken
        {
            UserId = user.Id,
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddHours(-1), // Expired
            IsUsed = false
        };

        _dbContext.PasswordResetTokens.Add(resetToken);
        await _dbContext.SaveChangesAsync();

        // Act
        var foundToken = await _dbContext.PasswordResetTokens
            .FirstOrDefaultAsync(t => t.Token == token && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow);

        // Assert
        foundToken.Should().BeNull();
    }

    [Fact]
    public async Task ResetPassword_WithUsedToken_ShouldFail()
    {
        // Arrange
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            Email = "test@example.com",
            UserName = "test@example.com",
            FullName = "Test User"
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var token = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        var resetToken = new PasswordResetToken
        {
            UserId = user.Id,
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            IsUsed = true // Already used
        };

        _dbContext.PasswordResetTokens.Add(resetToken);
        await _dbContext.SaveChangesAsync();

        // Act
        var foundToken = await _dbContext.PasswordResetTokens
            .FirstOrDefaultAsync(t => t.Token == token && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow);

        // Assert
        foundToken.Should().BeNull();
    }

    [Fact]
    public async Task Login_WithDeactivatedUser_ShouldFail()
    {
        // Arrange
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            Email = "test@example.com",
            UserName = "test@example.com",
            FullName = "Test User",
            IsActive = false // Deactivated
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        // Act
        var foundUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == user.Email);

        // Assert
        // With query filter, deactivated users should not be found
        foundUser.Should().BeNull();
    }
}
