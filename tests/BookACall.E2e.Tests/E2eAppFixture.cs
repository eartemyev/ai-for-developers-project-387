namespace BookACall.E2e.Tests;

public sealed class E2eAppFixture : IAsyncLifetime
{
    public E2eWebApplicationFactory Factory { get; private set; } = null!;

    public HttpClient Client { get; private set; } = null!;

    public string BaseUrl { get; private set; } = null!;

    public ValueTask InitializeAsync()
    {
        Factory = new E2eWebApplicationFactory();
        Factory.UseKestrel(0);
        Client = Factory.CreateClient();
        BaseUrl = Client.BaseAddress!.ToString().TrimEnd('/');
        return ValueTask.CompletedTask;
    }

    public async ValueTask DisposeAsync()
    {
        Client.Dispose();
        await Factory.DisposeAsync();
    }
}
